import { Router, Request, Response } from 'express';
import { param, body, validationResult } from 'express-validator';
import { PrismaClient, SeatStatus, Seat } from '../../generated/prisma/client';
import { cacheMiddleware, invalidateCache } from '../middleware/cache';
import { authenticateToken, requireAdmin, AuthRequest } from './auth';
import { SeatGenerationService } from '../services/seatGenerationService';
import { Server } from 'socket.io';

const router = Router();
const prisma = new PrismaClient();

// POST /api/rooms/:id/find-and-claim
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
                throw new Error('You already have a seat allocated in this room.');
            }

            // 3. Find all available seats in the room
            const availableSeats = await tx.seat.findMany({
                where: { roomId: roomId, status: SeatStatus.Available },
                orderBy: [{ row: 'asc' }, { col: 'asc' }]
            });

            if (availableSeats.length === 0) {
                throw new Error('No seats are currently available in this room.');
            }

            let bestSeat: Seat;

            // 4. If no specific needs requested, assign the first available seat
            if (!accessibilityNeeds || accessibilityNeeds.length === 0) {
                bestSeat = availableSeats[0];
            } else {
                // 5. If needs are requested, score and rank all available seats
                const rankedSeats = availableSeats.map(seat => {
                    const score = (accessibilityNeeds as string[]).reduce((currentScore, need) => {
                        if (seat.features.includes(need)) {
                            return currentScore + 1;
                        }
                        return currentScore;
                    }, 0);
                    return { seat, score };
                })
                .sort((a, b) => {
                    // Sort by score descending (higher score is better)
                    if (a.score !== b.score) {
                        return b.score - a.score;
                    }
                    // Tie-break by row ascending (lower row is better)
                    if (a.seat.row !== b.seat.row) {
                        return a.seat.row - b.seat.row;
                    }
                    // Tie-break by col ascending (lower col is better)
                    return a.seat.col - b.seat.col;
                });

                // The best seat is the first one in the sorted list
                if (rankedSeats.length > 0) {
                    bestSeat = rankedSeats[0].seat;
                } else {
                    // This case should not be reachable due to the initial check, but as a safeguard:
                    throw new Error('No suitable seats found.');
                }
            }

            // 6. Claim the best seat
            const updatedSeat = await tx.seat.update({
                where: { id: bestSeat.id },
                data: {
                    status: SeatStatus.Allocated,
                    studentId: student.id,
                    version: { increment: 1 }
                },
                include: { student: true }
            });

            // 7. Update the room's claimed count
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
        if (error.message === 'You already have a seat allocated in this room.') {
            return res.status(400).json({ message: error.message });
        }
        if (error.message === 'No seats are currently available in this room.') {
             return res.status(404).json({ message: error.message });
        }
        if (error.message === 'No suitable seats found.') {
            return res.status(404).json({ message: 'Sorry, no available seats could be found that meet your needs.' });
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
  body('capacity').isInt({ min: 1 }),
  body('rows').isInt({ min: 1 }),
  body('cols').isInt({ min: 1 })
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { buildingId, name, capacity, rows, cols } = req.body;

    if (capacity > rows * cols) {
      return res.status(400).json({ error: 'Capacity cannot exceed the total seats from dimensions (rows * cols)' });
    }

    const building = await prisma.building.findUnique({
      where: { id: buildingId }
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    const room = await prisma.room.create({
      data: { buildingId, name, capacity, rows, cols }
    });

    // Automatically generate seats for the new room
    await SeatGenerationService.generateSeatsForRoom(room.id, room.capacity, room.rows, room.cols, prisma);

    await invalidateCache('buildings');
    await invalidateCache(`room-seats:/api/rooms/${room.id}/seats`);

    res.status(201).json(room);
  } catch (error) {
    console.error('Failed to create room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// PUT /api/rooms/:id -> update room
router.put('/:id', [
  authenticateToken,
  requireAdmin,
  param('id').isString().notEmpty(),
  body('name').optional().isLength({ min: 1 }),
  body('capacity').optional().isInt({ min: 1 }),
  body('rows').optional().isInt({ min: 1 }),
  body('cols').optional().isInt({ min: 1 })
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { name, capacity, rows, cols } = req.body;

    const existingRoom = await prisma.room.findUnique({
      where: { id }
    });

    if (!existingRoom) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const updatedData = {
      name: name || existingRoom.name,
      capacity: capacity || existingRoom.capacity,
      rows: rows || existingRoom.rows,
      cols: cols || existingRoom.cols,
    };

    if (updatedData.capacity > updatedData.rows * updatedData.cols) {
      return res.status(400).json({ error: 'Capacity cannot exceed the total seats from dimensions (rows * cols)' });
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: updatedData,
    });
    
    // If dimensions or capacity changed, regenerate seats
    const dimensionsChanged = rows && rows !== existingRoom.rows;
    const colsChanged = cols && cols !== existingRoom.cols;
    const capacityChanged = capacity && capacity !== existingRoom.capacity;
    
    if (dimensionsChanged || colsChanged || capacityChanged) {
        await SeatGenerationService.generateSeatsForRoom(
            updatedRoom.id, 
            updatedRoom.capacity, 
            updatedRoom.rows, 
            updatedRoom.cols, 
            prisma
        );
        await invalidateCache(`room-seats:/api/rooms/${id}/seats`);
    }


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
    
    // Use a transaction to delete seats and then the room
    await prisma.$transaction(async (tx) => {
        await tx.seat.deleteMany({
            where: { roomId: id }
        });
        await tx.room.delete({
            where: { id }
        });
    });

    await invalidateCache('buildings');
    await invalidateCache(`room-seats:/api/rooms/${id}/seats`);

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') { // Prisma's record not found error
        return res.status(404).json({ error: 'Room not found' });
    }
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
