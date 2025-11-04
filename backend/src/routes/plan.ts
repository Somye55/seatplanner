import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AllocationService } from '../services/allocationService';
import { Server } from 'socket.io';
import { authenticateToken, requireAdmin } from './auth';
import { Branch } from '../../generated/prisma/client';

const router = Router();

// POST /api/plan/allocate-branch
router.post('/allocate-branch', [
    authenticateToken,
    requireAdmin,
    body('branch').isIn(Object.values(Branch)),
    body('buildingId').isString().notEmpty()
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { branch, buildingId } = req.body;
        const { summary } = await AllocationService.allocateBranchToBuilding(branch, buildingId);
        
        const io: Server = req.app.get('io');
        // A broad signal that rooms/seats have changed
        io.emit('allocationsUpdated');

        res.json({ summary });
    } catch (error) {
        console.error("Branch allocation failed:", error);
        res.status(500).json({ error: 'Failed to allocate branch to building' });
    }
});

export default router;
