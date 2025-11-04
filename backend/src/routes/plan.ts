import { Router, Request, Response } from 'express';
import { AllocationService } from '../services/allocationService';
import { Server } from 'socket.io';

const router = Router();

// POST /api/plan/allocate
router.post('/allocate', async (req: Request, res: Response) => {
    try {
        const { seats, summary } = await AllocationService.allocate();
        
        // Emit an event to all clients with the new full list of seats
        const io: Server = req.app.get('io');
        io.emit('seatsUpdated', seats);

        res.json({ seats, summary }); // Also return seats in the HTTP response
    } catch (error) {
        console.error("Allocation failed:", error);
        res.status(500).json({ error: 'Failed to allocate seats' });
    }
});

// POST /api/plan/rebalance
router.post('/rebalance', async (req: Request, res: Response) => {
    try {
        const { seats, summary } = await AllocationService.rebalance();

        // Emit an event to all clients with the new full list of seats
        const io: Server = req.app.get('io');
        io.emit('seatsUpdated', seats);

        res.json({ seats, rebalanceSummary: summary }); // Return seats and rename summary for consistency
    } catch (error) {
        console.error("Rebalance failed:", error);
        res.status(500).json({ error: 'Failed to rebalance allocations' });
    }
});

export default router;
