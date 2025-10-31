
import { Router } from 'express';
import { PrismaClient } from '../generated/prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/rooms/:id
router.get('/:id', async (req, res) => {
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
router.get('/:id/seats', async (req, res) => {
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
