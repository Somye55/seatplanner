import { Router, Request, Response } from "express";
import { param, body, validationResult } from "express-validator";
import { PrismaClient } from "../../generated/prisma/client";
import { cacheMiddleware, invalidateCache } from "../middleware/cache";
import { authenticateToken, requireAdmin } from "./auth";

const router = Router();
const prisma = new PrismaClient();

// GET /api/buildings -> list buildings
router.get(
  "/",
  cacheMiddleware("buildings"),
  async (req: Request, res: Response) => {
    try {
      const buildings = await prisma.building.findMany({
        include: {
          block: true,
          _count: {
            select: { rooms: true },
          },
        },
        orderBy: { name: "asc" },
      });
      const buildingsWithRoomCount = buildings.map((b: any) => ({
        id: b.id,
        name: b.name,
        code: b.code,
        blockId: b.blockId,
        blockName: b.block.name,
        distance: b.distance,
        roomCount: b._count.rooms,
      }));
      res.json(buildingsWithRoomCount);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch buildings" });
    }
  }
);

// POST /api/buildings -> create building
router.post(
  "/",
  [
    authenticateToken,
    requireAdmin,
    body("name")
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    body("code")
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Code must be between 1 and 50 characters"),
    body("blockId").isString().notEmpty().withMessage("Block ID is required"),
    body("distance")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Distance must be a positive number"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, code, blockId, distance } = req.body;

      // Validate that block exists
      const block = await prisma.block.findUnique({
        where: { id: blockId },
      });

      if (!block) {
        return res.status(400).json({
          error: "Invalid parent location in hierarchy",
          message: "Block not found",
        });
      }

      const existingBuilding = await prisma.building.findUnique({
        where: { code },
      });

      if (existingBuilding) {
        return res
          .status(400)
          .json({ error: "Building with this code already exists" });
      }

      const building = await prisma.building.create({
        data: {
          name,
          code,
          blockId,
          distance: distance !== undefined ? parseFloat(distance) : 0,
        },
      });

      await invalidateCache("buildings:*");
      await invalidateCache("blocks:*");

      res.status(201).json(building);
    } catch (error) {
      console.error("Failed to create building:", error);
      res.status(500).json({ error: "Failed to create building" });
    }
  }
);

// PUT /api/buildings/:id -> update building
router.put(
  "/:id",
  [
    authenticateToken,
    requireAdmin,
    param("id").isString().notEmpty(),
    body("name")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    body("code")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Code must be between 1 and 50 characters"),
    body("blockId")
      .optional()
      .isString()
      .notEmpty()
      .withMessage("Block ID must be valid"),
    body("distance")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Distance must be a positive number"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { name, code, blockId, distance } = req.body;

      const existingBuilding = await prisma.building.findUnique({
        where: { id },
      });

      if (!existingBuilding) {
        return res.status(404).json({ error: "Building not found" });
      }

      // Validate blockId if provided
      if (blockId) {
        const block = await prisma.block.findUnique({
          where: { id: blockId },
        });
        if (!block) {
          return res.status(400).json({
            error: "Invalid parent location in hierarchy",
            message: "Block not found",
          });
        }
      }

      if (code && code !== existingBuilding.code) {
        const codeExists = await prisma.building.findUnique({
          where: { code },
        });
        if (codeExists) {
          return res
            .status(400)
            .json({ error: "Building with this code already exists" });
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (code !== undefined) updateData.code = code;
      if (blockId !== undefined) updateData.blockId = blockId;
      if (distance !== undefined) updateData.distance = parseFloat(distance);

      const updatedBuilding = await prisma.building.update({
        where: { id },
        data: updateData,
      });

      await invalidateCache("buildings:*");
      await invalidateCache("blocks:*");

      res.json(updatedBuilding);
    } catch (error) {
      console.error("Failed to update building:", error);
      res.status(500).json({ error: "Failed to update building" });
    }
  }
);

// DELETE /api/buildings/:id -> delete building (cascades to floors and rooms)
router.delete(
  "/:id",
  [authenticateToken, requireAdmin, param("id").isString().notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;

      const building = await prisma.building.findUnique({
        where: { id },
      });

      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }

      // Delete building - cascades to all floors and rooms
      await prisma.building.delete({
        where: { id },
      });

      await invalidateCache("buildings:*");
      await invalidateCache("floors:*");

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete building" });
    }
  }
);

// GET /api/buildings/:id/rooms -> rooms in a building
router.get(
  "/:id/rooms",
  [param("id").isLength({ min: 1 })],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const buildingId = req.params.id;
      const buildingRooms = await prisma.room.findMany({
        where: { buildingId },
      });
      res.json(buildingRooms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  }
);

export default router;
