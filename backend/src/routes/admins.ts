import { Router, Response } from "express";
import bcrypt from "bcrypt";
import { body, param, validationResult } from "express-validator";
import { PrismaClient, UserRole } from "../../generated/prisma/client";
import { authenticateToken, requireSuperAdmin, AuthRequest } from "./auth";
import {
  sendError,
  sendValidationError,
  handleUnexpectedError,
  ErrorCode,
} from "../utils/errorHandler";

const router = Router();
const prisma = new PrismaClient();

// GET /api/admins - List all admins (super admin only)
router.get(
  "/",
  authenticateToken,
  requireSuperAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: UserRole.Admin,
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.json(admins);
    } catch (error) {
      return handleUnexpectedError(error, res);
    }
  }
);

// POST /api/admins - Create admin (super admin only)
router.post(
  "/",
  authenticateToken,
  requireSuperAdmin,
  [
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
      const { email, password } = req.body;

      // Check if user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return sendError(res, 400, ErrorCode.USER_EXISTS);
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const admin = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          role: UserRole.Admin,
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(201).json(admin);
    } catch (error) {
      return handleUnexpectedError(error, res);
    }
  }
);

// DELETE /api/admins/:id - Delete admin (super admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireSuperAdmin,
  [param("id").isString().notEmpty()],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    try {
      const admin = await prisma.user.findUnique({
        where: { id: req.params.id },
      });

      if (!admin) {
        return sendError(res, 404, ErrorCode.USER_NOT_FOUND);
      }

      // Prevent deleting super admins
      if (admin.role === UserRole.SuperAdmin) {
        return sendError(res, 403, ErrorCode.CANNOT_DELETE_SUPER_ADMIN);
      }

      // Only allow deleting admins
      if (admin.role !== UserRole.Admin) {
        return sendError(res, 400, ErrorCode.NOT_AN_ADMIN);
      }

      await prisma.user.delete({
        where: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error: any) {
      if (error.code === "P2025") {
        return sendError(res, 404, ErrorCode.USER_NOT_FOUND);
      }
      return handleUnexpectedError(error, res);
    }
  }
);

export default router;
