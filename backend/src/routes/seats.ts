import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient, SeatStatus } from '../../generated/prisma/client';
import { invalidateCache } from '../middleware/cache';
import { Server } from 'socket.io';
import { authenticateToken, requireAdmin } from './auth';

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
  let displacedStudentInfo: { studentId: string; buildingId: string; roomId: string } | null = null;

  try {
    const updatedSeatResult = await prisma.$transaction(async (tx) => {
      const seat = await tx.seat.findUnique({
        where: { id: seatId }
      });

      if (!seat) {
        throw new Error('Seat not found');
      }

      if (version !== seat.version) {
        const error: any = new Error('Conflict');
        error.currentSeat = seat;
        throw error;
      }

      const oldStatus = seat.status;
      const studentIdOnSeat = seat.studentId;
      const hadStudent = !!studentIdOnSeat;

      // Use version in where clause for true optimistic locking
      const updatedSeat = await tx.seat.update({
        where: { 
          id: seatId,
          version: version  // This ensures the update only succeeds if version matches
        },
        data: {
          status: status,
          studentId: status === SeatStatus.Allocated ? seat.studentId : null,
          version: { increment: 1 }
        },
        include: { student: true }
      });

      // If a student was on this seat and it becomes broken, they are displaced.
      if (oldStatus === SeatStatus.Allocated && status === SeatStatus.Broken && studentIdOnSeat) {
        const room = await tx.room.findUnique({ where: { id: seat.roomId } });
        if (room) {
            displacedStudentInfo = {
                studentId: studentIdOnSeat,
                buildingId: room.buildingId,
                roomId: room.id
            };
        }
      }

      let claimedIncrement = 0;
      if (hadStudent && status !== SeatStatus.Allocated) {
          claimedIncrement = -1;
      } else if (!hadStudent && status === SeatStatus.Allocated) {
          // This case is unlikely for admin, as they cannot assign students here
          // but we keep it for logical consistency.
          claimedIncrement = 1;
      }

      if (claimedIncrement !== 0) {
        await tx.room.update({
          where: { id: seat.roomId },
          data: { claimed: { increment: claimedIncrement } },
        });
      }

      return updatedSeat;
    });

    // After transaction, handle async reallocation if needed
    if (displacedStudentInfo) {
        const { studentId, buildingId, roomId } = displacedStudentInfo;
        import('../services/allocationService').then(({ AllocationService }) => {
            AllocationService.reallocateStudent(studentId, buildingId, roomId)
                .then((reallocResult: any) => {
                    const io: Server = req.app.get('io');
                    io.emit('reallocationResult', reallocResult);
                    if (reallocResult.newSeat) {
                       io.emit('seatUpdated', reallocResult.newSeat);
                    }
                })
                .catch((err: any) => console.error(`Reallocation for student ${studentId} failed`, err));
        });
    }


    await invalidateCache(`room-seats:/api/rooms/${updatedSeatResult.roomId}/seats`);

    const io: Server = req.app.get('io');
    io.emit('seatUpdated', updatedSeatResult);
    io.emit('roomUpdated');

    res.json(updatedSeatResult);

  } catch (error: any) {
    if (error.message === 'Seat not found') {
      return res.status(404).json({ message: 'Seat not found' });
    }
    if (error.message === 'Conflict') {
      return res.status(409).json({ 
        message: 'Seat has been modified by another user. Please refresh and try again.',
        currentSeat: error.currentSeat ? {
          id: error.currentSeat.id,
          status: error.currentSeat.status,
          version: error.currentSeat.version,
          studentId: error.currentSeat.studentId
        } : undefined
      });
    }
    // Prisma error when record not found (version mismatch in where clause)
    if (error.code === 'P2025') {
      // Fetch current seat state
      const currentSeat = await prisma.seat.findUnique({ 
        where: { id: seatId },
        select: { id: true, status: true, version: true, studentId: true }
      });
      return res.status(409).json({ 
        message: 'Seat has been modified by another user. Please refresh and try again.',
        currentSeat
      });
    }
    console.error('Failed to update seat status:', error);
    res.status(500).json({ error: 'Failed to update seat status' });
  }
});


// NEW ENDPOINT for updating features
router.patch('/:id/features', [
    authenticateToken,
    requireAdmin,
    param('id').isString().notEmpty(),
    body('features').isArray().withMessage('Features must be an array of strings.'),
    body('version').isInt({ min: 0 }).withMessage('Version is required for updates.')
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { features, version } = req.body;
    const seatId = req.params.id;

    try {
        const seat = await prisma.seat.findUnique({ where: { id: seatId } });

        if (!seat) {
            return res.status(404).json({ message: 'Seat not found' });
        }

        if (seat.version !== version) {
            return res.status(409).json({ 
                message: 'Seat has been modified. Please refresh and try again.',
                currentSeat: {
                    id: seat.id,
                    status: seat.status,
                    version: seat.version,
                    features: seat.features,
                    studentId: seat.studentId
                }
            });
        }

        const positionalFeatures = seat.features.filter(f => 
            ['front_row', 'back_row', 'middle_row', 'aisle_seat', 'middle_column_seat'].includes(f)
        );
        
        const newCustomFeatures = features.filter((f: string) => 
            !['front_row', 'back_row', 'middle_row', 'aisle_seat', 'middle_column_seat'].includes(f)
        );

        const finalFeatures = [...new Set([...positionalFeatures, ...newCustomFeatures])];

        const updatedSeat = await prisma.seat.update({
            where: { 
                id: seatId,
                version: version  // Optimistic locking
            },
            data: {
                features: finalFeatures,
                version: { increment: 1 }
            },
            include: { student: true }
        });

        await invalidateCache(`room-seats:/api/rooms/${updatedSeat.roomId}/seats`);
        
        const io: Server = req.app.get('io');
        io.emit('seatUpdated', updatedSeat);

        res.json(updatedSeat);

    } catch (error: any) {
        // Prisma error when record not found (version mismatch)
        if (error.code === 'P2025') {
            const currentSeat = await prisma.seat.findUnique({ 
                where: { id: seatId },
                select: { id: true, status: true, version: true, features: true, studentId: true }
            });
            return res.status(409).json({ 
                message: 'Seat has been modified. Please refresh and try again.',
                currentSeat
            });
        }
        console.error('Failed to update seat features:', error);
        res.status(500).json({ error: 'Failed to update seat features' });
    }
});

export default router;
