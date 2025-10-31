
import { Router, Request, Response } from 'express';
import { AllocationService } from '../services/allocationService';

const router = Router();

// POST /api/plan/allocate
router.post('/allocate', async (req: Request, res: Response) => {
    try {
        const result = await AllocationService.allocate();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to allocate seats' });
    }
});

// POST /api/plan/rebalance
router.post('/rebalance', async (req: Request, res: Response) => {
    try {
        const result = await AllocationService.rebalance();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to rebalance allocations' });
    }
});

export default router;
