
import { Router } from 'express';
import { seats } from '../data';
import { SeatStatus } from '../../types';

const router = Router();

// PATCH /api/seats/:id/status
router.patch('/:id/status', (req, res) => {
    const { status } = req.body as { status: SeatStatus };
    const seat = seats.find(s => s.id === req.params.id);

    if (seat) {
        seat.status = status;
        if (status !== SeatStatus.Allocated) {
            seat.studentId = undefined;
        }
        res.json(seat);
    } else {
        res.status(404).json({ message: 'Seat not found' });
    }
});

export default router;
