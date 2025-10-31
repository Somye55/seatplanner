
import { Router, Request, Response } from 'express';
import { param, body, validationResult } from 'express-validator';
import { PrismaClient } from '../generated/prisma/client';
import { cacheMiddleware, invalidateCache } from '../middleware/cache';
import { authenticateToken, requireAdmin } from './auth';

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

    await invalidateCache('buildings');

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
            where: { roomId: req.params.id }
        });
        res.json(roomSeats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch seats' });
    }
});

export default router;
