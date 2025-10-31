
import { Router } from 'express';
import { PrismaClient } from '../generated/prisma/client';

const router = Router();
const prisma = new PrismaClient();

// PATCH /api/seats/:id/status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body as { status: string };
        const seat = await prisma.seat.findUnique({
            where: { id: req.params.id }
        });

        if (seat) {
            const updatedSeat = await prisma.seat.update({
                where: { id: req.params.id },
                data: {
                    status: status as any,
                    studentId: status !== 'Allocated' ? null : seat.studentId
                }
            });
            res.json(updatedSeat);
        } else {
            res.status(404).json({ message: 'Seat not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to update seat status' });
    }
});

export default router;
