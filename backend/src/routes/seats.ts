import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient } from '../generated/prisma/client';
import { invalidateCache } from '../middleware/cache';
import { Server } from 'socket.io';

const router = Router();
const prisma = new PrismaClient();

// PATCH /api/seats/:id/status
router.patch('/:id/status', [
  param('id').isString().notEmpty(),
  body('status').isIn(['Available', 'Allocated', 'Broken', 'Blocked']),
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
          // If a seat is no longer allocated (e.g., broken, available), unassign the student.
          studentId: status !== 'Allocated' ? null : seat.studentId,
          version: { increment: 1 }
        },
        include: { student: true } // Include student for the response
      });

      return updatedSeat;
    });

    // Invalidate cache for the room's seats
    await invalidateCache(`room-seats:/api/rooms/${result.roomId}/seats`);

    // Emit real-time update
    const io: Server = req.app.get('io');
    io.emit('seatStatusChanged', {
      seatId: result.id,
      roomId: result.roomId,
      status: result.status
    });

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

export default router;
