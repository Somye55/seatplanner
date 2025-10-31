
import { Router, Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { PrismaClient } from '../generated/prisma/client';
import { cacheMiddleware } from '../middleware/cache';

const router = Router();
const prisma = new PrismaClient();

// GET /api/buildings -> list buildings
router.get('/', cacheMiddleware('buildings'), async (req: Request, res: Response) => {
    try {
        const buildings = await prisma.building.findMany({
            include: {
                _count: {
                    select: { rooms: true }
                }
            }
        });
        const buildingsWithRoomCount = buildings.map(b => ({
            id: b.id,
            name: b.name,
            code: b.code,
            roomCount: b._count.rooms
        }));
        res.json(buildingsWithRoomCount);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch buildings' });
    }
});

// GET /api/buildings/:id/rooms -> rooms in a building
router.get('/:id/rooms', [
  param('id').isUUID()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
    try {
        const buildingId = req.params.id;
        const buildingRooms = await prisma.room.findMany({
            where: { buildingId }
        });
        res.json(buildingRooms);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

export default router;
