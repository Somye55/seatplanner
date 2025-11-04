import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient, SeatStatus } from '../../generated/prisma/client';
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
  body('status').isIn(Object.values(SeatStatus)).withMessage(`Status must be one of: ${Object.values(SeatStatus).join(', ')}`),
  body('version').isInt({ min: 0 }).withMessage('Version is required for updates.')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { status, version } = req.body as { status: SeatStatus; version: number };
  const seatId = req.params.id;

  try {
    const result = await prisma.$transaction(async (tx: any) => {
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

      const oldStatus = seat.status;

      const updatedSeat = await tx.seat.update({
        where: { id: seatId },
        data: {
          status: status,
          // If a seat is being marked as available or broken, unassign any student.
          studentId: null,
          version: { increment: 1 }
        },
        include: { student: true } // Include student for the response
      });

      // Update room's claimed count based on status change
      let claimedIncrement = 0;
      if (status === SeatStatus.Broken && oldStatus === SeatStatus.Available) {
        claimedIncrement = 1; // Becoming unavailable
      } else if (status === SeatStatus.Available && oldStatus !== SeatStatus.Available) {
        claimedIncrement = -1; // Becoming available
      } else if (status === SeatStatus.Allocated && oldStatus === SeatStatus.Available) {
        claimedIncrement = 1; // Becoming unavailable
      }

      if (claimedIncrement !== 0) {
        await tx.room.update({
          where: { id: seat.roomId },
          data: { claimed: { increment: claimedIncrement } },
        });
      }

      return updatedSeat;
    });

    // Invalidate cache for the room's seats
    await invalidateCache(`room-seats:/api/rooms/${result.roomId}/seats`);

    // Emit real-time update with the FULL updated seat object
    const io: Server = req.app.get('io');
    io.emit('seatUpdated', result);

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
      const result = await prisma.$transaction(async (tx: any) => {
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
        if (seatToClaim.status !== SeatStatus.Available) {
          throw new Error('SeatNotAvailable');
        }
        if (seatToClaim.version !== version) {
          throw new Error('Conflict');
        }
  
        // 5. Update the seat and increment claimed on room
        const updatedSeat = await tx.seat.update({
          where: { id: seatId },
          data: {
            status: SeatStatus.Allocated,
            studentId: student.id,
            version: { increment: 1 },
          },
          include: { student: true },
        });

        // Increment claimed count on the room
        await tx.room.update({
          where: { id: seatToClaim.roomId },
          data: { claimed: { increment: 1 } },
        });
  
        return updatedSeat;
      });
  
      // Invalidate cache and emit real-time update
      await invalidateCache(`room-seats:/api/rooms/${result.roomId}/seats`);
      const io: Server = req.app.get('io');
      io.emit('seatUpdated', result);
  
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

// POST /api/seats -> create seats (bulk supported)
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('seats').isArray({ min: 1 }).withMessage('Seats array is required'),
  body('seats.*.roomId').isString().notEmpty().withMessage('roomId is required for each seat'),
  body('seats.*.label').isString().notEmpty().withMessage('label is required for each seat'),
  body('seats.*.row').isInt({ min: 0 }).withMessage('row must be a non-negative integer'),
  body('seats.*.col').isInt({ min: 0 }).withMessage('col must be a non-negative integer'),
  body('seats.*.features').optional().isArray().withMessage('features must be an array'),
  body('seats.*.status').optional().isIn(Object.values(SeatStatus)).withMessage(`status must be one of: ${Object.values(SeatStatus).join(', ')}`)
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { seats } = req.body;

    // Validate that all seats belong to the same room
    const roomIds = [...new Set(seats.map((s: any) => s.roomId))];
    if (roomIds.length !== 1) {
      return res.status(400).json({ error: 'All seats must belong to the same room' });
    }

    const roomId = roomIds[0] as string;

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check for duplicate labels in the same room
    const existingLabels = await prisma.seat.findMany({
      where: { roomId },
      select: { label: true }
    });
    const existingLabelSet = new Set(existingLabels.map(s => s.label));

    const duplicateLabels = seats.filter((s: any) => existingLabelSet.has(s.label));
    if (duplicateLabels.length > 0) {
      return res.status(400).json({
        error: `Duplicate seat labels in room: ${duplicateLabels.map((s: any) => s.label).join(', ')}`
      });
    }

    // Create seats in bulk
    const createdSeats = await prisma.seat.createMany({
      data: seats.map((s: any) => ({
        roomId: s.roomId,
        label: s.label,
        row: s.row,
        col: s.col,
        features: s.features || [],
        status: s.status || SeatStatus.Available
      }))
    });

    // Invalidate cache for the room's seats
    await invalidateCache(`room-seats:/api/rooms/${roomId}/seats`);

    res.status(201).json({ message: `${createdSeats.count} seats created successfully` });
  } catch (error) {
    console.error('Failed to create seats:', error);
    res.status(500).json({ error: 'Failed to create seats' });
  }
});
export default router;
