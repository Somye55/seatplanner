
import { Router } from 'express';
import { PrismaClient } from '../generated/prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/buildings -> list buildings
router.get('/', async (req, res) => {
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
router.get('/:id/rooms', async (req, res) => {
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
