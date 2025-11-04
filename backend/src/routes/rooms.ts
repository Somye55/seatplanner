import { Router, Request, Response } from 'express';
import { param, body, validationResult } from 'express-validator';
import { PrismaClient } from '../../generated/prisma/client';
import { cacheMiddleware, invalidateCache } from '../middleware/cache';
import { authenticateToken, requireAdmin } from './auth';
import { SeatGenerationService } from '../services/seatGenerationService';

const router = Router();
const prisma = new PrismaClient();

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
  param('id').isString().notEmpty(),
  authenticateToken
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
