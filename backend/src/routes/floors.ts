import { Router, Request, Response } from "express";
import { param, body, query, validationResult } from "express-validator";
import { PrismaClient } from "../../generated/prisma/client";
import { cacheMiddleware, invalidateCache } from "../middleware/cache";
import { authenticateToken, requireAdmin, requireAdminOrTeacher } from "./auth";

const router = Router();
const prisma = new PrismaClient();

// GET /api/locations/floors -> list floors (with optional buildingId filter)
router.get(
  "/",
  [
    authenticateToken,
    requireAdminOrTeacher,
    query("buildingId").optional().isString(),
  ],
  cacheMiddleware("floors"),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { buildingId } = req.query;

      const whereClause: any = {};
      if (buildingId) {
        whereClause.buildingId = buildingId as string;
      }

      const floors = await prisma.floor.findMany({
        where: whereClause,
        include: {
          building: {
            include: {
              block: true,
            },
          },
          _count: {
            select: { rooms: true },
          },
        },
        orderBy: [{ building: { name: "asc" } }, { number: "asc" }],
      });

      const floorsWithDetails = floors.map((floor: any) => ({
        id: floor.id,
        name: floor.name,
        number: floor.number,
        buildingId: floor.buildingId,
        buildingName: floor.building.name,
        blockName: floor.building.block.name,
        distance: floor.distance,
        roomCount: floor._count.rooms,
        createdAt: floor.createdAt,
        updatedAt: floor.updatedAt,
      }));

      res.json(floorsWithDetails);
    } catch (error) {
      console.error("Failed to fetch floors:", error);
      res.status(500).json({ error: "Failed to fetch floors" });
    }
  }
);

// POST /api/locations/floors -> create floor
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
    body("number").isInt().withMessage("Floor number must be an integer"),
    body("buildingId")
      .isString()
      .notEmpty()
      .withMessage("Building ID is required"),
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
      const { name, number, buildingId, distance } = req.body;

      // Validate that building exists
      const building = await prisma.building.findUnique({
        where: { id: buildingId },
      });

      if (!building) {
        return res.status(400).json({
          error: "Invalid parent location in hierarchy",
          message: "Building not found",
        });
      }

      const floor = await prisma.floor.create({
        data: {
          name,
          number: parseInt(number),
          buildingId,
          distance: distance !== undefined ? parseFloat(distance) : 0,
        },
      });

      await invalidateCache("floors:*");
      await invalidateCache("buildings:*");

      res.status(201).json(floor);
    } catch (error) {
      console.error("Failed to create floor:", error);
      res.status(500).json({ error: "Failed to create floor" });
    }
  }
);

// PUT /api/locations/floors/:id -> update floor
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
    body("number")
      .optional()
      .isInt()
      .withMessage("Floor number must be an integer"),
    body("buildingId")
      .optional()
      .isString()
      .notEmpty()
      .withMessage("Building ID must be valid"),
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
      const { name, number, buildingId, distance } = req.body;

      // Check if floor exists
      const existingFloor = await prisma.floor.findUnique({
        where: { id },
      });

      if (!existingFloor) {
        return res.status(404).json({ error: "Floor not found" });
      }

      // Validate buildingId if provided
      if (buildingId) {
        const building = await prisma.building.findUnique({
          where: { id: buildingId },
        });
        if (!building) {
          return res.status(400).json({
            error: "Invalid parent location in hierarchy",
            message: "Building not found",
          });
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (number !== undefined) updateData.number = parseInt(number);
      if (buildingId !== undefined) updateData.buildingId = buildingId;
      if (distance !== undefined) updateData.distance = parseFloat(distance);

      const updatedFloor = await prisma.floor.update({
        where: { id },
        data: updateData,
      });

      await invalidateCache("floors:*");
      await invalidateCache("buildings:*");

      res.json(updatedFloor);
    } catch (error) {
      console.error("Failed to update floor:", error);
      res.status(500).json({ error: "Failed to update floor" });
    }
  }
);

// DELETE /api/locations/floors/:id -> delete floor
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

      // Check if floor exists
      const floor = await prisma.floor.findUnique({
        where: { id },
        include: { rooms: true },
      });

      if (!floor) {
        return res.status(404).json({ error: "Floor not found" });
      }

      // Prevent deletion if floor has rooms
      if (floor.rooms.length > 0) {
        return res.status(400).json({
          error: "Cannot delete floor with existing rooms",
          message: "Location has children",
        });
      }

      await prisma.floor.delete({
        where: { id },
      });

      await invalidateCache("floors:*");
      await invalidateCache("buildings:*");

      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete floor:", error);
      res.status(500).json({ error: "Failed to delete floor" });
    }
  }
);

export default router;
