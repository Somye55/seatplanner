
import { Router } from 'express';
import { buildings, rooms } from '../data';

const router = Router();

// GET /api/buildings -> list buildings
router.get('/', (req, res) => {
    const buildingsWithRoomCount = buildings.map(b => ({
        ...b,
        roomCount: rooms.filter(r => r.buildingId === b.id).length
    }));
    res.json(buildingsWithRoomCount);
});

// GET /api/buildings/:id/rooms -> rooms in a building
router.get('/:id/rooms', (req, res) => {
    const buildingId = req.params.id;
    const buildingRooms = rooms.filter(r => r.buildingId === buildingId);
    res.json(buildingRooms);
});

export default router;
