import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import { PrismaClient, Branch } from "../../generated/prisma/client";

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const MASTER_PASSWORD =
  process.env.MASTER_PASSWORD || "default-master-password";

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

// POST /api/auth/signup - DISABLED
// Public signup is disabled. All user accounts must be created by administrators.
router.post("/signup", async (req: Request, res: Response) => {
  return res.status(403).json({
    error:
      "Public signup is disabled. Contact an administrator to create an account.",
  });
});

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").exists(),
    body("role").optional().isIn(["SuperAdmin", "Admin", "Teacher", "Student"]),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password, role } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // If role is provided, validate it matches the user's actual role
      // Allow SuperAdmin to login when "Admin" is selected
      // Don't reveal the actual role in the error message for security
      if (role && user.role !== role) {
        // Allow SuperAdmin to login as Admin
        if (!(role === "Admin" && user.role === "SuperAdmin")) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
      }

      // Generate JWT token with user role (Admin, Student, or Teacher)
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        user: { id: user.id, email: user.email, role: user.role },
        token,
      });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  }
);

// Middleware to verify JWT
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: any
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      // Distinguish between expired and invalid tokens
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ error: "Token expired. Please login again." });
      }
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
};

// Middleware to check if user is admin or super admin
export const requireAdmin = (req: AuthRequest, res: Response, next: any) => {
  if (req.user?.role !== "Admin" && req.user?.role !== "SuperAdmin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Middleware to check if user is super admin only
export const requireSuperAdmin = (
  req: AuthRequest,
  res: Response,
  next: any
) => {
  if (req.user?.role !== "SuperAdmin") {
    return res.status(403).json({ error: "Super Admin access required" });
  }
  next();
};

// Middleware to check if user is teacher
export const requireTeacher = (req: AuthRequest, res: Response, next: any) => {
  if (req.user?.role !== "Teacher") {
    return res.status(403).json({ error: "Teacher access required" });
  }
  next();
};

// Middleware to check if user is admin or teacher
export const requireAdminOrTeacher = (
  req: AuthRequest,
  res: Response,
  next: any
) => {
  if (
    req.user?.role !== "Admin" &&
    req.user?.role !== "Teacher" &&
    req.user?.role !== "SuperAdmin" &&
    req.user?.role !== "Student"
  ) {
    return res.status(403).json({ error: "Admin or Teacher access required" });
  }
  next();
};

// POST /api/auth/reset-password - Reset user password with master password (Admin/SuperAdmin only)
router.post(
  "/reset-password",
  authenticateToken,
  requireAdmin,
  [
    body("userEmail")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("masterPassword").exists().withMessage("Master password is required"),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { userEmail, newPassword, masterPassword } = req.body;

      // Verify master password
      if (masterPassword !== MASTER_PASSWORD) {
        return res.status(403).json({ error: "Invalid master password" });
      }

      // Find the user to reset
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Prevent resetting SuperAdmin password unless requester is SuperAdmin
      if (user.role === "SuperAdmin" && req.user?.role !== "SuperAdmin") {
        return res
          .status(403)
          .json({ error: "Cannot reset SuperAdmin password" });
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password
      await prisma.user.update({
        where: { email: userEmail },
        data: {
          password: hashedPassword,
          plainPassword: newPassword,
        },
      });

      res.json({
        message: "Password reset successfully",
        email: userEmail,
      });
    } catch (error) {
      res.status(500).json({ error: "Password reset failed" });
    }
  }
);

export default router;
