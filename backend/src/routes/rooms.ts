
import { Router, Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { PrismaClient } from '../generated/prisma/client';
import { cacheMiddleware } from '../middleware/cache';

const router = Router();
const prisma = new PrismaClient();

// GET /api/rooms/:id
router.get('/:id', [
  param('id').isUUID()
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

// GET /api/rooms/:id/seats
router.get('/:id/seats', [
  param('id').isUUID()
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
