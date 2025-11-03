import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient } from '../generated/prisma/client';
import { invalidateCache } from '../middleware/cache';
import { Server } from 'socket.io';
import { authenticateToken, requireAdmin, AuthRequest } from './auth';

const router = Router();
const prisma = new PrismaClient();

// PATCH /api/seats/:id/status
router.patch('/:id/status', [
  authenticateToken,
  requireAdmin,
  param('id').isString().notEmpty(),
  body('status').isIn(['Available', 'Broken']).withMessage('Status must be either Available or Broken'),
  body('version').isInt({ min: 0 }).withMessage('Version is required for updates.')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { status, version } = req.body as { status: string; version: number };
  const seatId = req.params.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const seat = await tx.seat.findUnique({
        where: { id: seatId }
      });

      if (!seat) {
        // This will cause the transaction to roll back
        throw new Error('Seat not found');
      }

      // Optimistic locking: check version
      if (version !== seat.version) {
        // This will cause the transaction to roll back
        throw new Error('Conflict');
      }

      const updatedSeat = await tx.seat.update({
        where: { id: seatId },
        data: {
          status: status as any,
          // If a seat is being marked as available or broken, unassign any student.
          studentId: null,
          version: { increment: 1 }
        },
        include: { student: true } // Include student for the response
      });

      return updatedSeat;
    });

    // Invalidate cache for the room's seats
    await invalidateCache(`room-seats:/api/rooms/${result.roomId}/seats`);

    // Emit real-time update with the FULL updated seat object
    const io: Server = req.app.get('io');
    io.emit('seatStatusChanged', result);

    res.json(result);

  } catch (error: any) {
    if (error.message === 'Seat not found') {
      return res.status(404).json({ message: 'Seat not found' });
    }
    if (error.message === 'Conflict') {
      return res.status(409).json({ message: 'Seat has been modified by another user. Please refresh and try again.' });
    }
    console.error('Failed to update seat status:', error);
    res.status(500).json({ error: 'Failed to update seat status' });
  }
});

// POST /api/seats/:id/claim
router.post('/:id/claim', [
    authenticateToken, // All logged-in users can attempt to claim
    param('id').isString().notEmpty(),
    body('version').isInt({ min: 0 }).withMessage('Version is required.'),
  ], async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
  
    const seatId = req.params.id;
    const { version } = req.body;
    const userEmail = req.user?.email;
  
    if (!userEmail) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
  
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Find the student record associated with the authenticated user
        const student = await tx.student.findUnique({
          where: { email: userEmail },
        });

        if (!student) {
          throw new Error('StudentProfileNotFound');
        }
  
        // 2. Find the seat to be claimed
        const seatToClaim = await tx.seat.findUnique({
          where: { id: seatId },
        });

        if (!seatToClaim) {
          throw new Error('SeatNotFound');
        }

        // 3. Check if student already has a seat in this room
        const existingSeatInRoom = await tx.seat.findFirst({
          where: {
            studentId: student.id,
            roomId: seatToClaim.roomId
          },
        });

        if (existingSeatInRoom) {
          throw new Error('StudentAlreadyHasSeatInRoom');
        }
  
        if (!seatToClaim) {
          throw new Error('SeatNotFound');
        }
  
        // 4. Check seat availability and version
        if (seatToClaim.status !== 'Available') {
          throw new Error('SeatNotAvailable');
        }
        if (seatToClaim.version !== version) {
          throw new Error('Conflict');
        }
  
        // 5. Update the seat
        const updatedSeat = await tx.seat.update({
          where: { id: seatId },
          data: {
            status: 'Allocated',
            studentId: student.id,
            version: { increment: 1 },
          },
          include: { student: true },
        });
  
        return updatedSeat;
      });
  
      // Invalidate cache and emit real-time update
      await invalidateCache(`room-seats:/api/rooms/${result.roomId}/seats`);
      const io: Server = req.app.get('io');
      io.emit('seatStatusChanged', result);
  
      res.json(result);
  
    } catch (error: any) {
      if (error.message === 'StudentProfileNotFound') {
        return res.status(404).json({ message: 'No student profile found for this user.' });
      }
      if (error.message === 'StudentAlreadyHasSeatInRoom') {
        return res.status(400).json({ message: 'You already have a seat allocated in this room.' });
      }
      if (error.message === 'SeatNotFound') {
        return res.status(404).json({ message: 'Seat not found.' });
      }
      if (error.message === 'SeatNotAvailable') {
        return res.status(409).json({ message: 'This seat is no longer available.' });
      }
      if (error.message === 'Conflict') {
        return res.status(409).json({ message: 'Seat has been modified by another user. Please refresh and try again.' });
      }
      console.error('Failed to claim seat:', error);
      res.status(500).json({ error: 'Failed to claim seat.' });
    }
  });

export default router;
