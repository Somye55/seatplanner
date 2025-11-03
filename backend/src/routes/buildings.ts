import { Router, Request, Response } from 'express';
import { param, body, validationResult } from 'express-validator';
import { PrismaClient } from '../../generated/prisma/client';
import { cacheMiddleware, invalidateCache } from '../middleware/cache';
import { authenticateToken, requireAdmin } from './auth';

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
        const buildingsWithRoomCount = buildings.map((b: any) => ({
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

// POST /api/buildings -> create building
router.post('/', [
  authenticateToken,
  requireAdmin,
  body('name').isLength({ min: 1 }),
  body('code').isLength({ min: 1 })
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, code } = req.body;

    const existingBuilding = await prisma.building.findUnique({
      where: { code }
    });

    if (existingBuilding) {
      return res.status(400).json({ error: 'Building with this code already exists' });
    }

    const building = await prisma.building.create({
      data: { name, code }
    });

    await invalidateCache('buildings');

    res.status(201).json(building);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create building' });
  }
});

// PUT /api/buildings/:id -> update building
router.put('/:id', [
  authenticateToken,
  requireAdmin,
  param('id').isString().notEmpty(),
  body('name').optional().isLength({ min: 1 }),
  body('code').optional().isLength({ min: 1 })
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { name, code } = req.body;

    const existingBuilding = await prisma.building.findUnique({
      where: { id }
    });

    if (!existingBuilding) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (code && code !== existingBuilding.code) {
      const codeExists = await prisma.building.findUnique({
        where: { code }
      });
      if (codeExists) {
        return res.status(400).json({ error: 'Building with this code already exists' });
      }
    }

    const updatedBuilding = await prisma.building.update({
      where: { id },
      data: { name, code }
    });

    await invalidateCache('buildings');

    res.json(updatedBuilding);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update building' });
  }
});

// DELETE /api/buildings/:id -> delete building
router.delete('/:id', [
  authenticateToken,
  requireAdmin,
  param('id').isString().notEmpty()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;

    const building = await prisma.building.findUnique({
      where: { id },
      include: { rooms: true }
    });

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    if (building.rooms.length > 0) {
      return res.status(400).json({ error: 'Cannot delete building with existing rooms' });
    }

    await prisma.building.delete({
      where: { id }
    });

    await invalidateCache('buildings');

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete building' });
  }
});

// GET /api/buildings/:id/rooms -> rooms in a building
router.get('/:id/rooms', [
  param('id').isLength({ min: 1 })
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
