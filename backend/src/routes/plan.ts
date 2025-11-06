import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AllocationService } from '../services/allocationService';
import { Server } from 'socket.io';
import { authenticateToken, requireAdmin } from './auth';
import { Branch } from '../../generated/prisma/client';
import { invalidateCache } from '../middleware/cache';

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

        // Invalidate cache for affected rooms
        for (const roomId of summary.affectedRoomIds) {
            await invalidateCache(`room-seats:/api/rooms/${roomId}/seats`);
        }

        const io: Server = req.app.get('io');
        // A broad signal that rooms/seats have changed
        io.emit('allocationsUpdated');

        res.json({ summary });
    } catch (error) {
        console.error("Branch allocation failed:", error);
        res.status(500).json({ error: 'Failed to allocate branch to building' });
    }
});

// POST /api/plan/allocate-branch-to-room
router.post('/allocate-branch-to-room', [
    authenticateToken,
    requireAdmin,
    body('branch').isIn(Object.values(Branch)),
    body('roomId').isString().notEmpty()
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { branch, roomId } = req.body;
        const { summary } = await AllocationService.allocateBranchToRoom(branch, roomId);

        // Invalidate cache for the room's seats
        await invalidateCache(`room-seats:/api/rooms/${roomId}/seats`);

        const io: Server = req.app.get('io');
        // A broad signal that rooms/seats have changed
        io.emit('allocationsUpdated');

        res.json({ summary });
    } catch (error) {
        console.error("Branch allocation to room failed:", error);
        res.status(500).json({ error: 'Failed to allocate branch to room' });
    }
});

export default router;
