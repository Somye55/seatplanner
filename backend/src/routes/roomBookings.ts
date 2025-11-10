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
import { roomLockService } from "../services/roomLockService";

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

    const startTimeDate = new Date(req.body.startTime);
    const endTimeDate = new Date(req.body.endTime);
    const { roomId } = req.body;
    const userId = req.user?.id;

    try {
      const { branch, capacity } = req.body;

      if (!userId) {
        return sendError(res, 401, ErrorCode.UNAUTHORIZED);
      }

      // Step 1: Try to acquire lock
      const lockAcquired = roomLockService.acquireLock(
        roomId,
        userId,
        startTimeDate,
        endTimeDate
      );

      if (!lockAcquired) {
        const lockHolder = roomLockService.getLockHolder(
          roomId,
          startTimeDate,
          endTimeDate
        );

        // Emit conflict event to the requesting user
        const io = req.app.get("io");
        if (io) {
          io.emit("bookingConflict", {
            roomId,
            startTime: startTimeDate,
            endTime: endTimeDate,
            userId,
            message: "Another teacher is currently booking this room",
          });
        }

        return sendError(
          res,
          409,
          ErrorCode.ROOM_NOT_AVAILABLE,
          "Another teacher is currently booking this room. Please try again."
        );
      }

      // Find the teacher by userId
      const teacher = await prisma.teacher.findFirst({
        where: { userId },
      });

      if (!teacher) {
        roomLockService.releaseLock(roomId, startTimeDate, endTimeDate);
        return sendError(res, 404, ErrorCode.TEACHER_NOT_FOUND);
      }

      // Verify room exists and has sufficient capacity
      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        roomLockService.releaseLock(roomId, startTimeDate, endTimeDate);
        return sendError(res, 404, ErrorCode.ROOM_NOT_FOUND);
      }

      if (room.capacity < capacity) {
        roomLockService.releaseLock(roomId, startTimeDate, endTimeDate);
        return sendError(res, 400, ErrorCode.INSUFFICIENT_CAPACITY);
      }

      // Step 2: Check if teacher already has a booking at this time
      const teacherConflict = await prisma.roomBooking.findFirst({
        where: {
          teacherId: teacher.id,
          status: { in: ["NotStarted", "Ongoing"] },
          OR: [
            {
              AND: [
                { startTime: { lt: endTimeDate } },
                { endTime: { gt: startTimeDate } },
              ],
            },
          ],
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
        },
      });

      if (teacherConflict) {
        roomLockService.releaseLock(roomId, startTimeDate, endTimeDate);

        const roomLocation = `${teacherConflict.room.building.block.name} - ${teacherConflict.room.building.name} - ${teacherConflict.room.floor.name} - ${teacherConflict.room.name}`;

        return sendError(
          res,
          409,
          ErrorCode.TEACHER_TIME_CONFLICT,
          `You already have a booking at ${roomLocation} during this time slot. A teacher cannot book multiple rooms at the same time.`
        );
      }

      // Step 3: Double-check for overlapping bookings (race condition protection)
      const overlappingBooking = await prisma.roomBooking.findFirst({
        where: {
          roomId,
          status: { in: ["NotStarted", "Ongoing"] },
          OR: [
            {
              AND: [
                { startTime: { lt: endTimeDate } },
                { endTime: { gt: startTimeDate } },
              ],
            },
          ],
        },
        include: {
          teacher: {
            select: {
              name: true,
            },
          },
        },
      });

      if (overlappingBooking) {
        roomLockService.releaseLock(roomId, startTimeDate, endTimeDate);

        // Emit conflict event with details
        const io = req.app.get("io");
        if (io) {
          io.emit("bookingConflict", {
            roomId,
            startTime: startTimeDate,
            endTime: endTimeDate,
            userId,
            conflictingBooking: {
              id: overlappingBooking.id,
              teacherName: overlappingBooking.teacher.name,
              startTime: overlappingBooking.startTime,
              endTime: overlappingBooking.endTime,
            },
            message: `Room already booked by ${overlappingBooking.teacher.name}`,
          });
        }

        return sendError(
          res,
          409,
          ErrorCode.ROOM_NOT_AVAILABLE,
          `This room is already booked by ${overlappingBooking.teacher.name} for the selected time slot.`
        );
      }

      // Step 4: Create the booking and allocate students to the room
      const booking = await prisma.roomBooking.create({
        data: {
          roomId,
          teacherId: teacher.id,
          branch,
          capacity,
          startTime: startTimeDate,
          endTime: endTimeDate,
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

      // Step 5: Automatically allocate all students from the branch to the room
      const { AllocationService } = await import(
        "../services/allocationService"
      );
      try {
        // Check if room has seats before attempting allocation
        const seatCount = await prisma.seat.count({
          where: { roomId },
        });

        if (seatCount === 0) {
          console.warn(
            `Room ${roomId} has no seats. Skipping student allocation. Please ensure seats are generated for this room.`
          );
        } else {
          const allocationResult = await AllocationService.allocateBranchToRoom(
            branch,
            roomId
          );
          console.log(
            `Auto-allocated ${allocationResult.summary.allocatedCount} students from ${branch} to room ${roomId} (${allocationResult.summary.unallocatedCount} unallocated)`
          );

          if (allocationResult.summary.unallocatedCount > 0) {
            console.warn(
              `${allocationResult.summary.unallocatedCount} students could not be allocated. Reasons:`,
              allocationResult.summary.unallocatedStudents.map(
                (u) => `${u.student.name}: ${u.reason}`
              )
            );
          }
        }
      } catch (allocationError) {
        console.error("Failed to auto-allocate students:", allocationError);
        // Don't fail the booking if allocation fails - the booking is still valid
      }

      // Step 6: Release lock after successful booking
      roomLockService.releaseLock(roomId, startTimeDate, endTimeDate);

      // Invalidate search cache
      RoomSearchService.invalidateSearchCache();

      // Emit real-time update to all connected clients
      const io = req.app.get("io");
      if (io) {
        io.emit("bookingCreated", booking);
      }

      res.status(201).json(booking);
    } catch (error) {
      // Release lock on error
      roomLockService.releaseLock(roomId, startTimeDate, endTimeDate);
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

      // Deallocate students from the room before deleting the booking
      // Only if the room is allocated to this branch
      try {
        const room = await prisma.room.findUnique({
          where: { id: booking.roomId },
        });

        // Only deallocate if the room is currently allocated to this booking's branch
        if (room && room.branchAllocated === booking.branch) {
          // Find all students from this branch that are allocated to this room
          const allocatedSeats = await prisma.seat.findMany({
            where: {
              roomId: booking.roomId,
              status: "Allocated",
              student: {
                branch: booking.branch,
              },
            },
            include: {
              student: true,
            },
          });

          // Deallocate all seats for students from this branch
          if (allocatedSeats.length > 0) {
            await prisma.$transaction(async (tx) => {
              // Update all seats to Available and remove student assignment
              await tx.seat.updateMany({
                where: {
                  id: { in: allocatedSeats.map((s) => s.id) },
                },
                data: {
                  status: "Available",
                  studentId: null,
                },
              });

              // Update room claimed count and clear branchAllocated
              await tx.room.update({
                where: { id: booking.roomId },
                data: {
                  claimed: { decrement: allocatedSeats.length },
                  branchAllocated: null,
                },
              });
            });

            console.log(
              `Deallocated ${allocatedSeats.length} students from room ${booking.roomId} after booking cancellation`
            );
          }
        }
      } catch (deallocationError) {
        console.error("Failed to deallocate students:", deallocationError);
        // Continue with booking deletion even if deallocation fails
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
