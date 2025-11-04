import { Router, Request, Response } from 'express';
import { param, body, validationResult } from 'express-validator';
import { PrismaClient, SeatStatus } from '../../generated/prisma/client';
import { cacheMiddleware, invalidateCache } from '../middleware/cache';
import { authenticateToken, requireAdmin, AuthRequest } from './auth';
import { SeatGenerationService } from '../services/seatGenerationService';
import { Server } from 'socket.io';

const router = Router();
const prisma = new PrismaClient();

// NEW ENDPOINT: POST /api/rooms/:id/find-and-claim
router.post('/:id/find-and-claim', [
    authenticateToken,
    param('id').isString().notEmpty(),
    body('accessibilityNeeds').isArray().withMessage('accessibilityNeeds must be an array.')
], async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const roomId = req.params.id;
    const { accessibilityNeeds } = req.body;
    const userEmail = req.user?.email;

    if (!userEmail) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    try {
        const claimedSeat = await prisma.$transaction(async (tx) => {
            // 1. Get student profile
            const student = await tx.student.findUnique({ where: { email: userEmail } });
            if (!student) {
                throw new Error('StudentProfileNotFound');
            }

            // 2. Check if student already has a seat in this room
            const existingSeat = await tx.seat.findFirst({
                where: { studentId: student.id, roomId: roomId }
            });
            if (existingSeat) {
                throw new Error('StudentAlreadyHasSeatInRoom');
            }

            // 3. Find all available seats in the room
            const availableSeats = await tx.seat.findMany({
                where: { roomId: roomId, status: SeatStatus.Available },
                orderBy: [{ row: 'asc' }, { col: 'asc' }] // Prioritize front seats
            });

            // 4. Find the best seat that matches ALL needs
            const bestSeat = availableSeats.find(seat => 
                accessibilityNeeds.every((need: string) => seat.features.includes(need))
            );
            
            if (!bestSeat) {
                throw new Error('NoSuitableSeatsFound');
            }

            // 5. Claim the best seat
            const updatedSeat = await tx.seat.update({
                where: { id: bestSeat.id },
                data: {
                    status: SeatStatus.Allocated,
                    studentId: student.id,
                    version: { increment: 1 }
                },
                include: { student: true }
            });

            // 6. Update the room's claimed count
            await tx.room.update({
                where: { id: roomId },
                data: { claimed: { increment: 1 } }
            });

            return updatedSeat;
        });

        // Invalidate cache and emit real-time update
        await invalidateCache(`room-seats:/api/rooms/${roomId}/seats`);
        const io: Server = req.app.get('io');
        io.emit('seatUpdated', claimedSeat);

        res.json(claimedSeat);

    } catch (error: any) {
        if (error.message === 'StudentProfileNotFound') {
            return res.status(404).json({ message: 'No student profile found for this user.' });
        }
        if (error.message === 'StudentAlreadyHasSeatInRoom') {
            return res.status(400).json({ message: 'You already have a seat allocated in this room.' });
        }
        if (error.message === 'NoSuitableSeatsFound') {
            return res.status(404).json({ message: 'Sorry, no available seats match your selected accessibility needs.' });
        }
        console.error('Failed to find and claim seat:', error);
        res.status(500).json({ error: 'Failed to claim seat.' });
    }
});


// GET /api/rooms/:id
router.get('/:id', [
  param('id').isString().notEmpty()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
    try {
        const room = await prisma.room.findUnique({
            where: { id: req.params.id }
        });
        if (room) {
            res.json(room);
        } else {
            res.status(404).json({ message: 'Room not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch room' });
    }
});

// POST /api/rooms -> create room
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('buildingId').isString().notEmpty(),
  body('name').isLength({ min: 1 }),
  body('capacity').isInt({ min: 1 })
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { buildingId, name, capacity } = req.body;

    const building = await prisma.building.findUnique({
      where: { id: buildingId }
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    const room = await prisma.room.create({
      data: { buildingId, name, capacity }
    });

    // Automatically generate seats for the new room
    await SeatGenerationService.generateSeatsForRoom(room.id, room.capacity, prisma);

    await invalidateCache('buildings');
    // Invalidate cache for the new room's seats
    await invalidateCache(`room-seats:/api/rooms/${room.id}/seats`);

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// PUT /api/rooms/:id -> update room
router.put('/:id', [
  authenticateToken,
  requireAdmin,
  param('id').isString().notEmpty(),
  body('name').optional().isLength({ min: 1 }),
  body('capacity').optional().isInt({ min: 1 })
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { name, capacity } = req.body;

    const existingRoom = await prisma.room.findUnique({
      where: { id }
    });

    if (!existingRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Note: Complex capacity changes (adjusting seats) are not handled here for simplicity.
    // A more robust implementation would check for allocated seats before changing capacity.
    const updatedRoom = await prisma.room.update({
      where: { id },
      data: { name, capacity }
    });

    await invalidateCache('buildings');

    res.json(updatedRoom);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE /api/rooms/:id -> delete room
router.delete('/:id', [
  authenticateToken,
  requireAdmin,
  param('id').isString().notEmpty()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: { seats: true }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.seats.length > 0) {
      return res.status(400).json({ error: 'Cannot delete room with existing seats' });
    }

    await prisma.room.delete({
      where: { id }
    });

    await invalidateCache('buildings');

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// GET /api/rooms/:id/seats
router.get('/:id/seats', [
  param('id').isString().notEmpty()
], cacheMiddleware('room-seats'), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
    try {
        const roomSeats = await prisma.seat.findMany({
            where: { roomId: req.params.id },
            include: { student: true }
        });
        res.json(roomSeats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch seats' });
    }
});

export default router;
