import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { body, param, validationResult } from "express-validator";
import { PrismaClient, Branch } from "../../generated/prisma/client";
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

// GET /api/students/me - gets current student profile
router.get(
  "/me",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const student = await prisma.student.findUnique({
        where: { email: req.user.email },
        include: {
          seats: {
            include: {
              room: {
                include: {
                  building: true,
                },
              },
            },
          },
        },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }
      res.json(student);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch student profile" });
    }
  }
);

// PUT /api/students/me - updates current student profile
router.put(
  "/me",
  [authenticateToken, body("accessibilityNeeds").optional().isArray()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Reject if name is in the request body
    if ("name" in req.body) {
      return sendError(res, 400, ErrorCode.NAME_UPDATE_FORBIDDEN);
    }

    try {
      const { accessibilityNeeds } = req.body;
      const student = await prisma.student.findUnique({
        where: { email: req.user.email },
      });
      if (!student) {
        return sendError(res, 404, ErrorCode.STUDENT_NOT_FOUND);
      }

      const dataToUpdate: { accessibilityNeeds?: string[] } = {};
      if (accessibilityNeeds)
        dataToUpdate.accessibilityNeeds = accessibilityNeeds;

      const updatedStudent = await prisma.student.update({
        where: { email: req.user.email },
        data: dataToUpdate,
      });
      res.json(updatedStudent);
    } catch (error) {
      return handleUnexpectedError(error, res);
    }
  }
);

// GET /api/students
router.get(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const students = await prisma.student.findMany({
        include: {
          seats: {
            include: {
              room: { include: { building: true } },
            },
          },
        },
      });
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  }
);

// POST /api/students
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  [
    body("name").isString().notEmpty(),
    body("email").isEmail(),
    body("branch")
      .isIn(Object.values(Branch))
      .withMessage("A valid branch is required."),
    body("tags").isArray(),
    body("accessibilityNeeds").isArray(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const studentData = req.body;
      const newStudent = await prisma.student.create({
        data: studentData,
      });
      res.status(201).json(newStudent);
    } catch (error) {
      res.status(500).json({ error: "Failed to create student" });
    }
  }
);

// PUT /api/students/:id - Update student (name field read-only, admin only)
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
    body("branch").optional().isIn(Object.values(Branch)),
    body("tags").optional().isArray(),
    body("accessibilityNeeds").optional().isArray(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Reject if name is in the request body
    if ("name" in req.body) {
      return sendError(res, 400, ErrorCode.NAME_UPDATE_FORBIDDEN);
    }

    try {
      const { email, password, branch, tags, accessibilityNeeds } = req.body;

      // Find the student
      const student = await prisma.student.findUnique({
        where: { id: req.params.id },
        include: { user: true },
      });

      if (!student) {
        return sendError(res, 404, ErrorCode.STUDENT_NOT_FOUND);
      }

      // Prepare update data
      const studentUpdateData: any = {};
      const userUpdateData: any = {};

      if (email) {
        // Check if email is already taken by another user
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (existingUser && existingUser.id !== student.userId) {
          return sendError(res, 400, ErrorCode.EMAIL_IN_USE);
        }

        studentUpdateData.email = email;
        userUpdateData.email = email;
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        userUpdateData.password = hashedPassword;
      }

      if (branch !== undefined) studentUpdateData.branch = branch;
      if (tags !== undefined) studentUpdateData.tags = tags;
      if (accessibilityNeeds !== undefined)
        studentUpdateData.accessibilityNeeds = accessibilityNeeds;

      // Update both student and user in a transaction
      const updatedStudent = await prisma.$transaction(async (tx) => {
        // Update user if there are changes
        if (Object.keys(userUpdateData).length > 0 && student.userId) {
          await tx.user.update({
            where: { id: student.userId },
            data: userUpdateData,
          });
        }

        // Update student if there are changes
        if (Object.keys(studentUpdateData).length > 0) {
          return await tx.student.update({
            where: { id: req.params.id },
            data: studentUpdateData,
          });
        }

        // If only password was updated, fetch the student
        return await tx.student.findUnique({
          where: { id: req.params.id },
        });
      });

      res.json(updatedStudent);
    } catch (error: any) {
      if (error.code === "P2025") {
        return sendError(res, 404, ErrorCode.STUDENT_NOT_FOUND);
      }
      return handleUnexpectedError(error, res);
    }
  }
);

// DELETE /api/students/:id
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  [param("id").isString().notEmpty()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      await prisma.student.delete({
        where: { id: req.params.id },
      });
      res.status(204).send();
    } catch (error: any) {
      if (error.code === "P2025") {
        res.status(404).json({ message: "Student not found" });
      } else {
        res.status(500).json({ error: "Failed to delete student" });
      }
    }
  }
);

export default router;
