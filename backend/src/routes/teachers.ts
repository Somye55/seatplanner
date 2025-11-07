import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { body, param, validationResult } from "express-validator";
import { PrismaClient } from "../../generated/prisma/client";
import { authenticateToken, requireAdmin, AuthRequest } from "./auth";
import {
  sendError,
  sendValidationError,
  handlePrismaError,
  handleUnexpectedError,
  ErrorCode,
} from "../utils/errorHandler";

const router = Router();
const prisma = new PrismaClient();

// GET /api/teachers - List all teachers (admin only)
router.get(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const teachers = await prisma.teacher.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          bookings: {
            include: {
              room: {
                include: {
                  building: true,
                  floor: true,
                },
              },
            },
          },
        },
      });
      res.json(teachers);
    } catch (error) {
      return handleUnexpectedError(error, res);
    }
  }
);

// GET /api/teachers/:id - Get teacher details (admin only)
router.get(
  "/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isString().notEmpty()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    try {
      const teacher = await prisma.teacher.findUnique({
        where: { id: req.params.id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          bookings: {
            include: {
              room: {
                include: {
                  building: true,
                  floor: true,
                },
              },
            },
          },
        },
      });

      if (!teacher) {
        return sendError(res, 404, ErrorCode.TEACHER_NOT_FOUND);
      }

      res.json(teacher);
    } catch (error) {
      return handleUnexpectedError(error, res);
    }
  }
);

// POST /api/teachers - Create teacher profile (admin only)
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  [
    body("name").isString().notEmpty().withMessage("Name is required"),
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    try {
      const { name, email, password } = req.body;

      // Check if user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return sendError(res, 400, ErrorCode.TEACHER_EXISTS);
      }

      // Check if teacher with this email already exists
      const existingTeacher = await prisma.teacher.findUnique({
        where: { email },
      });

      if (existingTeacher) {
        return sendError(res, 400, ErrorCode.TEACHER_EXISTS);
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      // Use a transaction to ensure both user and teacher profile are created
      const teacher = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            role: "Teacher",
          },
        });

        const newTeacher = await tx.teacher.create({
          data: {
            name,
            email,
            userId: newUser.id,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        });

        return newTeacher;
      });

      res.status(201).json(teacher);
    } catch (error) {
      return handleUnexpectedError(error, res);
    }
  }
);

// PUT /api/teachers/:id - Update teacher (email/password only, admin only)
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  [
    param("id").isString().notEmpty(),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password")
      .optional()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    try {
      const { email, password } = req.body;

      // Reject if name is in the request body
      if ("name" in req.body) {
        return sendError(res, 400, ErrorCode.NAME_UPDATE_FORBIDDEN);
      }

      // Find the teacher
      const teacher = await prisma.teacher.findUnique({
        where: { id: req.params.id },
        include: { user: true },
      });

      if (!teacher) {
        return sendError(res, 404, ErrorCode.TEACHER_NOT_FOUND);
      }

      // Prepare update data
      const teacherUpdateData: any = {};
      const userUpdateData: any = {};

      if (email) {
        // Check if email is already taken by another user
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser && existingUser.id !== teacher.userId) {
          return sendError(res, 400, ErrorCode.EMAIL_IN_USE);
        }

        teacherUpdateData.email = email;
        userUpdateData.email = email;
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        userUpdateData.password = hashedPassword;
      }

      // Update both teacher and user in a transaction
      const updatedTeacher = await prisma.$transaction(async (tx) => {
        // Update user if there are changes
        if (Object.keys(userUpdateData).length > 0 && teacher.userId) {
          await tx.user.update({
            where: { id: teacher.userId },
            data: userUpdateData,
          });
        }

        // Update teacher if there are changes
        if (Object.keys(teacherUpdateData).length > 0) {
          return await tx.teacher.update({
            where: { id: req.params.id },
            data: teacherUpdateData,
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true,
                },
              },
            },
          });
        }

        // If only password was updated, fetch the teacher
        return await tx.teacher.findUnique({
          where: { id: req.params.id },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
              },
            },
          },
        });
      });

      res.json(updatedTeacher);
    } catch (error: any) {
      if (error.code === "P2025") {
        return sendError(res, 404, ErrorCode.TEACHER_NOT_FOUND);
      }
      return handleUnexpectedError(error, res);
    }
  }
);

// DELETE /api/teachers/:id - Delete teacher (admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isString().notEmpty()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    try {
      // Find the teacher to get the userId
      const teacher = await prisma.teacher.findUnique({
        where: { id: req.params.id },
      });

      if (!teacher) {
        return sendError(res, 404, ErrorCode.TEACHER_NOT_FOUND);
      }

      // Delete teacher and associated user in a transaction
      await prisma.$transaction(async (tx) => {
        // Delete teacher first (this will cascade delete bookings)
        await tx.teacher.delete({
          where: { id: req.params.id },
        });

        // Delete associated user if exists
        if (teacher.userId) {
          await tx.user.delete({
            where: { id: teacher.userId },
          });
        }
      });

      res.status(204).send();
    } catch (error: any) {
      if (error.code === "P2025") {
        return sendError(res, 404, ErrorCode.TEACHER_NOT_FOUND);
      }
      return handleUnexpectedError(error, res);
    }
  }
);

export default router;
