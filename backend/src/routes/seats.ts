
import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient } from '../generated/prisma/client';
import { invalidateCache } from '../middleware/cache';

const router = Router();
const prisma = new PrismaClient();

// PATCH /api/seats/:id/status
router.patch('/:id/status', [
  param('id').isUUID(),
  body('status').isIn(['Available', 'Allocated', 'Broken', 'Blocked']),
  body('version').isInt({ min: 0 })
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
    try {
        const { status, version } = req.body as { status: string; version: number };
        const seat = await prisma.seat.findUnique({
            where: { id: req.params.id }
        });

        if (!seat) {
            return res.status(404).json({ message: 'Seat not found' });
        }

        // Optimistic locking: check version
        if (version !== seat.version) {
            return res.status(409).json({ message: 'Seat has been modified by another user. Please refresh and try again.' });
        }

        // Use transaction for atomic updates
        const result = await prisma.$transaction(async (tx) => {
            const updatedSeat = await tx.seat.update({
                where: { id: req.params.id },
                data: {
                    status: status as any,
                    studentId: status !== 'Allocated' ? null : seat.studentId,
                    version: { increment: 1 }
                }
            });

            // If marking as broken, deactivate allocation
            if (status === 'Broken' && seat.studentId) {
                await tx.seat.update({
                    where: { id: req.params.id },
                    data: { studentId: null }
                });
            }

            return updatedSeat;
        });

        // Invalidate cache for the room's seats
        await invalidateCache(`room-seats:/api/rooms/${seat.roomId}/seats`);

        // Emit real-time update
        const io = req.app.get('io');
        io.emit('seatStatusChanged', { seatId: seat.id, roomId: seat.roomId, status: status });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update seat status' });
    }
});

export default router;
