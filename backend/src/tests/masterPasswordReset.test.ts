import request from "supertest";
import express from "express";
import authRouter from "../routes/auth";
import { PrismaClient } from "../../generated/prisma/client";
import bcrypt from "bcrypt";

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);

const prisma = new PrismaClient();

describe("Master Password Reset", () => {
  let adminToken: string;
  let superAdminToken: string;
  let testStudentEmail: string;
  let testTeacherEmail: string;

  beforeAll(async () => {
    // Create test admin
    const adminPassword = await bcrypt.hash("admin123", 10);
    const admin = await prisma.user.create({
      data: {
        email: "test-admin-reset@example.com",
        password: adminPassword,
        plainPassword: "admin123",
        role: "Admin",
      },
    });

    // Create test superadmin
    const superAdminPassword = await bcrypt.hash("superadmin123", 10);
    const superAdmin = await prisma.user.create({
      data: {
        email: "test-superadmin-reset@example.com",
        password: superAdminPassword,
        plainPassword: "superadmin123",
        role: "SuperAdmin",
      },
    });

    // Create test student
    const student = await prisma.student.create({
      data: {
        name: "Test Student Reset",
        email: "test-student-reset@example.com",
        branch: "TechAndInnovationClub",
        tags: [],
        accessibilityNeeds: [],
      },
    });

    const studentPassword = await bcrypt.hash("student123", 10);
    await prisma.user.create({
      data: {
        email: student.email,
        password: studentPassword,
        plainPassword: "student123",
        role: "Student",
        studentId: student.id,
      },
    });
    testStudentEmail = student.email;

    // Create test teacher
    const teacher = await prisma.teacher.create({
      data: {
        name: "Test Teacher Reset",
        email: "test-teacher-reset@example.com",
        password: "teacher123",
      },
    });

    const teacherPassword = await bcrypt.hash("teacher123", 10);
    await prisma.user.create({
      data: {
        email: teacher.email,
        password: teacherPassword,
        plainPassword: "teacher123",
        role: "Teacher",
        teacherId: teacher.id,
      },
    });
    testTeacherEmail = teacher.email;

    // Login as admin
    const adminLoginRes = await request(app).post("/api/auth/login").send({
      email: admin.email,
      password: "admin123",
    });
    adminToken = adminLoginRes.body.token;

    // Login as superadmin
    const superAdminLoginRes = await request(app).post("/api/auth/login").send({
      email: superAdmin.email,
      password: "superadmin123",
    });
    superAdminToken = superAdminLoginRes.body.token;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "test-admin-reset@example.com",
            "test-superadmin-reset@example.com",
            testStudentEmail,
            testTeacherEmail,
          ],
        },
      },
    });
    await prisma.student.deleteMany({
      where: { email: testStudentEmail },
    });
    await prisma.teacher.deleteMany({
      where: { email: testTeacherEmail },
    });
    await prisma.$disconnect();
  });

  it("should reset student password with valid master password", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userEmail: testStudentEmail,
        newPassword: "newPassword123",
        masterPassword:
          process.env.MASTER_PASSWORD || "default-master-password",
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Password reset successfully");
    expect(res.body.email).toBe(testStudentEmail);

    // Verify new password works
    const loginRes = await request(app).post("/api/auth/login").send({
      email: testStudentEmail,
      password: "newPassword123",
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });

  it("should reset teacher password with valid master password", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userEmail: testTeacherEmail,
        newPassword: "newTeacherPass456",
        masterPassword:
          process.env.MASTER_PASSWORD || "default-master-password",
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Password reset successfully");
  });

  it("should reject reset with invalid master password", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userEmail: testStudentEmail,
        newPassword: "newPassword123",
        masterPassword: "wrong-master-password",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Invalid master password");
  });

  it("should reject reset for non-existent user", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userEmail: "nonexistent@example.com",
        newPassword: "newPassword123",
        masterPassword:
          process.env.MASTER_PASSWORD || "default-master-password",
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });

  it("should reject reset without authentication", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({
        userEmail: testStudentEmail,
        newPassword: "newPassword123",
        masterPassword:
          process.env.MASTER_PASSWORD || "default-master-password",
      });

    expect(res.status).toBe(401);
  });

  it("should allow superadmin to reset superadmin password", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        userEmail: "test-superadmin-reset@example.com",
        newPassword: "newSuperAdminPass789",
        masterPassword:
          process.env.MASTER_PASSWORD || "default-master-password",
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Password reset successfully");
  });

  it("should prevent admin from resetting superadmin password", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userEmail: "test-superadmin-reset@example.com",
        newPassword: "attemptedReset123",
        masterPassword:
          process.env.MASTER_PASSWORD || "default-master-password",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Cannot reset SuperAdmin password");
  });

  it("should validate password length", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userEmail: testStudentEmail,
        newPassword: "short",
        masterPassword:
          process.env.MASTER_PASSWORD || "default-master-password",
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("should validate email format", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userEmail: "invalid-email",
        newPassword: "newPassword123",
        masterPassword:
          process.env.MASTER_PASSWORD || "default-master-password",
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});
