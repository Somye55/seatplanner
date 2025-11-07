import { Router, Request, Response } from "express";
import { param, body, validationResult } from "express-validator";
import { PrismaClient } from "../../generated/prisma/client";
import { cacheMiddleware, invalidateCache } from "../middleware/cache";
import { authenticateToken, requireAdmin } from "./auth";

const router = Router();
const prisma = new PrismaClient();

// GET /api/locations/blocks -> list all blocks
router.get(
  "/",
  [authenticateToken], // Allow all authenticated users to read blocks
  cacheMiddleware("blocks"),
  async (req: Request, res: Response) => {
    try {
      const blocks = await prisma.block.findMany({
        include: {
          _count: {
            select: { buildings: true },
          },
        },
        orderBy: { name: "asc" },
      });

      const blocksWithBuildingCount = blocks.map((block: any) => ({
        id: block.id,
        name: block.name,
        code: block.code,
        distance: block.distance,
        buildingCount: block._count.buildings,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
      }));

      res.json(blocksWithBuildingCount);
    } catch (error) {
      console.error("Failed to fetch blocks:", error);
      res.status(500).json({ error: "Failed to fetch blocks" });
    }
  }
);

// POST /api/locations/blocks -> create block
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
      .matches(/^[A-Z0-9-]+$/)
      .withMessage(
        "Code must contain only uppercase letters, numbers, and hyphens"
      ),
    body("distance")
      .isFloat({ min: 0 })
      .withMessage("Distance must be a positive number"),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, code, distance } = req.body;

      // Check if block with this code already exists
      const existingBlock = await prisma.block.findUnique({
        where: { code },
      });

      if (existingBlock) {
        return res
          .status(400)
          .json({ error: "Block with this code already exists" });
      }

      const block = await prisma.block.create({
        data: {
          name,
          code,
          distance: parseFloat(distance),
        },
      });

      await invalidateCache("blocks:*");

      res.status(201).json(block);
    } catch (error) {
      console.error("Failed to create block:", error);
      res.status(500).json({ error: "Failed to create block" });
    }
  }
);

// PUT /api/locations/blocks/:id -> update block
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
      .matches(/^[A-Z0-9-]+$/)
      .withMessage(
        "Code must contain only uppercase letters, numbers, and hyphens"
      ),
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
      const { name, code, distance } = req.body;

      // Check if block exists
      const existingBlock = await prisma.block.findUnique({
        where: { id },
      });

      if (!existingBlock) {
        return res.status(404).json({ error: "Block not found" });
      }

      // If code is being changed, check for duplicates
      if (code && code !== existingBlock.code) {
        const codeExists = await prisma.block.findUnique({
          where: { code },
        });
        if (codeExists) {
          return res
            .status(400)
            .json({ error: "Block with this code already exists" });
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (code !== undefined) updateData.code = code;
      if (distance !== undefined) updateData.distance = parseFloat(distance);

      const updatedBlock = await prisma.block.update({
        where: { id },
        data: updateData,
      });

      await invalidateCache("blocks:*");

      res.json(updatedBlock);
    } catch (error) {
      console.error("Failed to update block:", error);
      res.status(500).json({ error: "Failed to update block" });
    }
  }
);

// DELETE /api/locations/blocks/:id -> delete block
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

      // Check if block exists
      const block = await prisma.block.findUnique({
        where: { id },
        include: { buildings: true },
      });

      if (!block) {
        return res.status(404).json({ error: "Block not found" });
      }

      // Prevent deletion if block has buildings
      if (block.buildings.length > 0) {
        return res.status(400).json({
          error: "Cannot delete block with existing buildings",
          message: "Location has children",
        });
      }

      await prisma.block.delete({
        where: { id },
      });

      await invalidateCache("blocks:*");

      res.status(204).send();
    } catch (error) {
      console.error("Failed to delete block:", error);
      res.status(500).json({ error: "Failed to delete block" });
    }
  }
);

export default router;
