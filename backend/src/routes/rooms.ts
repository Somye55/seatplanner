
import { Router } from 'express';
import { rooms, seats } from '../data';

const router = Router();

// GET /api/rooms/:id
router.get('/:id', (req, res) => {
    const room = rooms.find(r => r.id === req.params.id);
    if (room) {
        res.json(room);
    } else {
        res.status(404).json({ message: 'Room not found' });
    }
});

// GET /api/rooms/:id/seats
router.get('/:id/seats', (req, res) => {
    const roomSeats = seats.filter(s => s.roomId === req.params.id);
    res.json(roomSeats);
});

export default router;
