import { Router, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { PrismaClient, Branch } from "../../generated/prisma/client";
import {
  authenticateToken,
  requireTeacher,
  requireAdminOrTeacher,
  AuthRequest,
} from "./auth";
import {
  RoomSearchService,
  SearchCriteria,
} from "../services/roomSearchService";
import {
  sendError,
  sendValidationError,
  handleUnexpectedError,
  ErrorCode,
} from "../utils/errorHandler";

const router = Router();
const prisma = new PrismaClient();

// POST /api/room-bookings/search - Search for suitable rooms
router.post(
  "/search",
  authenticateToken,
  requireTeacher,
  [
    body("capacity")
      .isInt({ min: 1, max: 1000 })
      .withMessage("Capacity must be between 1 and 1000"),
    body("branch").isIn(Object.values(Branch)).withMessage("Invalid branch"),
    body("startTime")
      .isISO8601()
      .toDate()
      .withMessage("Valid start time is required"),
    body("endTime")
      .isISO8601()
      .toDate()
      .withMessage("Valid end time is required"),
    body("endTime").custom((endTime, { req }) => {
      const startTime = new Date(req.body.startTime);
      const end = new Date(endTime);
      if (end <= startTime) {
        throw new Error("End time must be after start time");
      }
      return true;
    }),
    body("startTime").custom((startTime) => {
      const start = new Date(startTime);
      const now = new Date();
      if (start <= now) {
        throw new Error("Start time must be in the future");
      }
      return true;
    }),
    body("currentLocation")
      .isObject()
      .withMessage("Current location is required"),
    body("currentLocation").custom((currentLocation) => {
      if (
        !currentLocation.blockId &&
        !currentLocation.buildingId &&
        !currentLocation.floorId
      ) {
        throw new Error(
          "Current location must specify at least one level (block, building, or floor)"
        );
      }
      return true;
    }),
    body("currentLocation.blockId").optional().isString(),
    body("currentLocation.buildingId").optional().isString(),
    body("currentLocation.floorId").optional().isString(),
    body("preferredLocation").optional().isObject(),
    body("preferredLocation.blockId").optional().isString(),
    body("preferredLocation.buildingId").optional().isString(),
    body("preferredLocation.floorId").optional().isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    try {
      const {
        capacity,
        branch,
        startTime,
        endTime,
        currentLocation,
        preferredLocation,
      } = req.body;

      const criteria: SearchCriteria = {
        capacity,
        branch,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        currentLocation,
        preferredLocation,
      };

      const recommendations = await RoomSearchService.searchRooms(criteria);

      res.json({ rooms: recommendations });
    } catch (error) {
      return handleUnexpectedError(error, res);
    }
  }
);

// POST /api/room-bookings - Create a room booking (teacher only)
router.post(
  "/",
  authenticateToken,
  requireTeacher,
  [
    body("roomId").isString().notEmpty().withMessage("Room ID is required"),
    body("branch").isIn(Object.values(Branch)).withMessage("Invalid branch"),
    body("capacity")
      .isInt({ min: 1, max: 1000 })
      .withMessage("Capacity must be between 1 and 1000"),
    body("startTime")
      .isISO8601()
      .toDate()
      .withMessage("Valid start time is required"),
    body("endTime")
      .isISO8601()
      .toDate()
      .withMessage("Valid end time is required"),
    body("endTime").custom((endTime, { req }) => {
      const startTime = new Date(req.body.startTime);
      const end = new Date(endTime);
      if (end <= startTime) {
        throw new Error("End time must be after start time");
      }
      return true;
    }),
    body("startTime").custom((startTime) => {
      const start = new Date(startTime);
      const now = new Date();
      if (start <= now) {
        throw new Error("Start time must be in the future");
      }
      return true;
    }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    try {
      const { roomId, branch, capacity, startTime, endTime } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 401, ErrorCode.UNAUTHORIZED);
      }

      // Find the teacher by userId
      const teacher = await prisma.teacher.findFirst({
        where: { userId },
      });

      if (!teacher) {
        return sendError(res, 404, ErrorCode.TEACHER_NOT_FOUND);
      }

      // Verify room exists and has sufficient capacity
      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        return sendError(res, 404, ErrorCode.ROOM_NOT_FOUND);
      }

      if (room.capacity < capacity) {
        return sendError(res, 400, ErrorCode.INSUFFICIENT_CAPACITY);
      }

      // Check for overlapping bookings
      const overlappingBooking = await prisma.roomBooking.findFirst({
        where: {
          roomId,
          status: { in: ["NotStarted", "Ongoing"] },
          OR: [
            {
              AND: [
                { startTime: { lt: new Date(endTime) } },
                { endTime: { gt: new Date(startTime) } },
              ],
            },
          ],
        },
      });

      if (overlappingBooking) {
        return sendError(res, 409, ErrorCode.ROOM_NOT_AVAILABLE);
      }

      // Create the booking
      const booking = await prisma.roomBooking.create({
        data: {
          roomId,
          teacherId: teacher.id,
          branch,
          capacity,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          status: "NotStarted",
        },
        include: {
          room: {
            include: {
              building: {
                include: {
                  block: true,
                },
              },
              floor: true,
            },
          },
          teacher: true,
        },
      });

      // Invalidate search cache
      RoomSearchService.invalidateSearchCache();

      // Emit real-time update
      const io = req.app.get("io");
      if (io) {
        io.emit("bookingCreated", booking);
      }

      res.status(201).json(booking);
    } catch (error) {
      return handleUnexpectedError(error, res);
    }
  }
);

// GET /api/room-bookings - List bookings (filtered by teacherId or roomId)
router.get(
  "/",
  authenticateToken,
  requireAdminOrTeacher,
  [
    query("teacherId").optional().isString(),
    query("roomId").optional().isString(),
    query("status").optional().isIn(["NotStarted", "Ongoing", "Completed"]),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    try {
      const { teacherId, roomId, status } = req.query;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      // Build where clause
      const whereClause: any = {};

      if (roomId) {
        whereClause.roomId = roomId as string;
      }

      if (status) {
        whereClause.status = status as string;
      }

      // Non-admin users can only query their own bookings
      if (userRole === "Teacher") {
        // Find the teacher by userId
        const teacher = await prisma.teacher.findFirst({
          where: { userId },
        });

        if (!teacher) {
          return sendError(res, 404, ErrorCode.TEACHER_NOT_FOUND);
        }

        // If teacherId is provided and doesn't match, return 403
        if (teacherId && teacherId !== teacher.id) {
          return sendError(res, 403, ErrorCode.FORBIDDEN);
        }

        whereClause.teacherId = teacher.id;
      } else if (teacherId) {
        // Admin can filter by any teacherId
        whereClause.teacherId = teacherId as string;
      }

      const bookings = await prisma.roomBooking.findMany({
        where: whereClause,
        include: {
          room: {
            include: {
              building: {
                include: {
                  block: true,
                },
              },
              floor: true,
            },
          },
          teacher: true,
        },
        orderBy: {
          startTime: "desc",
        },
      });

      res.json(bookings);
    } catch (error) {
      return handleUnexpectedError(error, res);
    }
  }
);

// DELETE /api/room-bookings/:id - Cancel a booking (teacher only, own bookings)
router.delete(
  "/:id",
  authenticateToken,
  requireTeacher,
  [param("id").isString().notEmpty()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    try {
      const bookingId = req.params.id;
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 401, ErrorCode.UNAUTHORIZED);
      }

      // Find the teacher by userId
      const teacher = await prisma.teacher.findFirst({
        where: { userId },
      });

      if (!teacher) {
        return sendError(res, 404, ErrorCode.TEACHER_NOT_FOUND);
      }

      // Find the booking
      const booking = await prisma.roomBooking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        return sendError(res, 404, ErrorCode.BOOKING_NOT_FOUND);
      }

      // Verify the booking belongs to the teacher
      if (booking.teacherId !== teacher.id) {
        return sendError(res, 403, ErrorCode.FORBIDDEN);
      }

      // Cannot cancel ongoing or completed bookings
      if (booking.status === "Ongoing") {
        return sendError(res, 400, ErrorCode.CANNOT_CANCEL_ONGOING);
      }

      if (booking.status === "Completed") {
        return sendError(res, 400, ErrorCode.CANNOT_CANCEL_COMPLETED);
      }

      // Delete the booking
      await prisma.roomBooking.delete({
        where: { id: bookingId },
      });

      // Invalidate search cache
      RoomSearchService.invalidateSearchCache();

      // Emit real-time update
      const io = req.app.get("io");
      if (io) {
        io.emit("bookingCanceled", { bookingId, roomId: booking.roomId });
      }

      res.status(204).send();
    } catch (error: any) {
      if (error.code === "P2025") {
        return sendError(res, 404, ErrorCode.BOOKING_NOT_FOUND);
      }
      return handleUnexpectedError(error, res);
    }
  }
);

export default router;
