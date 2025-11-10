import { Router, Request, Response } from "express";
import { param, body, validationResult } from "express-validator";
import { PrismaClient } from "../../generated/prisma/client";
import { cacheMiddleware, invalidateCache } from "../middleware/cache";
import { authenticateToken, requireAdmin } from "./auth";
import { SeatGenerationService } from "../services/seatGenerationService";

const router = Router();
const prisma = new PrismaClient();

// GET /api/rooms -> list all rooms
router.get(
  "/",
  cacheMiddleware("rooms"),
  async (req: Request, res: Response) => {
    try {
      const rooms = await prisma.room.findMany({
        include: {
          building: true,
          floor: true,
        },
        orderBy: { name: "asc" },
      });
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rooms" });
    }
  }
);

// GET /api/rooms/:id
router.get(
  "/:id",
  [param("id").isString().notEmpty()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const room = await prisma.room.findUnique({
        where: { id: req.params.id },
      });
      if (room) {
        res.json(room);
      } else {
        res.status(404).json({ message: "Room not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch room" });
    }
  }
);

// POST /api/rooms -> create room
router.post(
  "/",
  [
    authenticateToken,
    requireAdmin,
    body("buildingId").isString().notEmpty(),
    body("floorId").isString().notEmpty().withMessage("Floor ID is required"),
    body("name")
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Name must be between 1 and 100 characters"),
    body("capacity").isInt({ min: 1 }),
    body("rows").isInt({ min: 1 }),
    body("cols").isInt({ min: 1 }),
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
      const { buildingId, floorId, name, capacity, rows, cols, distance } =
        req.body;

      if (capacity > rows * cols) {
        return res.status(400).json({
          error:
            "Capacity cannot exceed the total seats from dimensions (rows * cols)",
        });
      }

      const building = await prisma.building.findUnique({
        where: { id: buildingId },
      });

      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }

      // Validate that floor exists and belongs to the building
      const floor = await prisma.floor.findUnique({
        where: { id: floorId },
      });

      if (!floor) {
        return res.status(400).json({
          error: "Invalid parent location in hierarchy",
          message: "Floor not found",
        });
      }

      if (floor.buildingId !== buildingId) {
        return res
          .status(400)
          .json({ error: "Floor does not belong to the specified building" });
      }

      const room = await prisma.room.create({
        data: {
          buildingId,
          floorId,
          name,
          capacity,
          rows,
          cols,
          distance: distance !== undefined ? parseFloat(distance) : 0,
        },
      });

      // Automatically generate seats for the new room
      await SeatGenerationService.generateSeatsForRoom(
        room.id,
        room.capacity,
        room.rows,
        room.cols,
        prisma
      );

      await invalidateCache("buildings:*");
      await invalidateCache("floors:*");
      await invalidateCache(`room-seats:/api/rooms/${room.id}/seats`);

      res.status(201).json(room);
    } catch (error) {
      console.error("Failed to create room:", error);
      res.status(500).json({ error: "Failed to create room" });
    }
  }
);

// PUT /api/rooms/:id -> update room
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
    body("capacity").optional().isInt({ min: 1 }),
    body("rows").optional().isInt({ min: 1 }),
    body("cols").optional().isInt({ min: 1 }),
    body("floorId")
      .optional()
      .isString()
      .notEmpty()
      .withMessage("Floor ID must be valid"),
    body("distance")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Distance must be a positive number"),
    body("version")
      .isInt({ min: 0 })
      .withMessage("Version is required for updates."),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const { name, capacity, rows, cols, floorId, distance, version } =
        req.body;

      const existingRoom = await prisma.room.findUnique({
        where: { id },
      });

      if (!existingRoom) {
        return res.status(404).json({ error: "Room not found" });
      }

      if (existingRoom.version !== version) {
        return res.status(409).json({
          message:
            "Room has been modified by another user. Please refresh and try again.",
          currentRoom: {
            id: existingRoom.id,
            name: existingRoom.name,
            capacity: existingRoom.capacity,
            rows: existingRoom.rows,
            cols: existingRoom.cols,
            version: existingRoom.version,
            claimed: existingRoom.claimed,
            branchAllocated: existingRoom.branchAllocated,
          },
        });
      }

      // Validate floorId if provided
      if (floorId) {
        const floor = await prisma.floor.findUnique({
          where: { id: floorId },
        });
        if (!floor) {
          return res.status(400).json({
            error: "Invalid parent location in hierarchy",
            message: "Floor not found",
          });
        }
        // Ensure floor belongs to the room's building
        if (floor.buildingId !== existingRoom.buildingId) {
          return res.status(400).json({
            error: "Floor does not belong to the room's building",
          });
        }
      }

      const updatedData: any = {
        name: name || existingRoom.name,
        capacity: capacity || existingRoom.capacity,
        rows: rows || existingRoom.rows,
        cols: cols || existingRoom.cols,
      };

      if (floorId !== undefined) updatedData.floorId = floorId;
      if (distance !== undefined) updatedData.distance = parseFloat(distance);

      if (updatedData.capacity > updatedData.rows * updatedData.cols) {
        return res.status(400).json({
          error:
            "Capacity cannot exceed the total seats from dimensions (rows * cols)",
        });
      }

      const updatedRoom = await prisma.room.update({
        where: {
          id,
          version: version,
        },
        data: {
          ...updatedData,
          version: { increment: 1 },
        },
      });

      // If dimensions or capacity changed, regenerate seats
      const dimensionsChanged = rows && rows !== existingRoom.rows;
      const colsChanged = cols && cols !== existingRoom.cols;
      const capacityChanged = capacity && capacity !== existingRoom.capacity;

      if (dimensionsChanged || colsChanged || capacityChanged) {
        await SeatGenerationService.generateSeatsForRoom(
          updatedRoom.id,
          updatedRoom.capacity,
          updatedRoom.rows,
          updatedRoom.cols,
          prisma
        );
        await invalidateCache(`room-seats:/api/rooms/${id}/seats`);
      }

      await invalidateCache("buildings:*");
      await invalidateCache("floors:*");

      res.json(updatedRoom);
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(409).json({
          message:
            "Room has been modified by another user. Please refresh and try again.",
        });
      }
      res.status(500).json({ error: "Failed to update room" });
    }
  }
);

// DELETE /api/rooms/:id -> delete room
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

      // Use a transaction to delete seats and then the room
      await prisma.$transaction(async (tx) => {
        await tx.seat.deleteMany({
          where: { roomId: id },
        });
        await tx.room.delete({
          where: { id },
        });
      });

      await invalidateCache("buildings:*");
      await invalidateCache(`room-seats:/api/rooms/${id}/seats`);

      res.status(204).send();
    } catch (error: any) {
      if (error.code === "P2025") {
        // Prisma's record not found error
        return res.status(404).json({ error: "Room not found" });
      }
      res.status(500).json({ error: "Failed to delete room" });
    }
  }
);

// GET /api/rooms/:id/seats
router.get(
  "/:id/seats",
  [param("id").isString().notEmpty(), authenticateToken],
  cacheMiddleware("room-seats"),
  async (req: any, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;

      // Admin and SuperAdmin can see all seats
      if (
        userRole === "Admin" ||
        userRole === "SuperAdmin" ||
        userRole === "Teacher"
      ) {
        const roomSeats = await prisma.seat.findMany({
          where: { roomId: req.params.id },
          include: { student: true },
        });
        return res.json(roomSeats);
      }

      // Students can only see their own seat if they have one in this room
      if (userRole === "Student") {
        // Find the student record associated with this user
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: { student: true },
        });

        if (!user?.student) {
          return res.json([]); // Student has no seat
        }

        // Check if student has a seat in this room
        const studentSeat = await prisma.seat.findFirst({
          where: {
            roomId: req.params.id,
            studentId: user.student.id,
          },
          include: { student: true },
        });

        if (studentSeat) {
          return res.json([studentSeat]); // Return only their seat
        }

        return res.json([]); // Student has no seat in this room
      }

      // Default: no access
      return res.status(403).json({ error: "Access denied" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch seats" });
    }
  }
);

export default router;
