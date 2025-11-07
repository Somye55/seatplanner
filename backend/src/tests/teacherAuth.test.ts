import request from "supertest";
import express from "express";
import { PrismaClient } from "../../generated/prisma/client";
import bcrypt from "bcrypt";
import authRouter from "../routes/auth";
import teachersRouter from "../routes/teachers";

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/teachers", teachersRouter);

const prisma = new PrismaClient();

describe("Teacher Authentication and Authorization", () => {
  let teacherUser: any;
  let adminUser: any;
  let teacherToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Clean up test data
    await prisma.teacher.deleteMany({
      where: { email: { contains: "test-teacher" } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "test-" } },
    });

    // Create admin user
    const hashedAdminPassword = await bcrypt.hash("admin123", 10);
    adminUser = await prisma.user.create({
      data: {
        email: "test-admin@example.com",
        password: hashedAdminPassword,
        role: "Admin",
      },
    });

    // Create teacher user
    const hashedTeacherPassword = await bcrypt.hash("teacher123", 10);
    teacherUser = await prisma.user.create({
      data: {
        email: "test-teacher@example.com",
        password: hashedTeacherPassword,
        role: "Teacher",
      },
    });

    // Create teacher profile
    await prisma.teacher.create({
      data: {
        name: "Test Teacher",
        email: "test-teacher@example.com",
        userId: teacherUser.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.teacher.deleteMany({
      where: { email: { contains: "test-teacher" } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "test-" } },
    });
    await prisma.$disconnect();
  });

  describe("Teacher Login", () => {
    it("should allow teacher to login with valid credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "test-teacher@example.com",
        password: "teacher123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("role", "Teacher");
      expect(response.body.user).toHaveProperty(
        "email",
        "test-teacher@example.com"
      );

      teacherToken = response.body.token;
    });

    it("should reject teacher login with invalid password", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "test-teacher@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Invalid credentials");
    });

    it("should reject login for non-existent teacher", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: "password123",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Invalid credentials");
    });
  });

  describe("Admin Login", () => {
    it("should allow admin to login with valid credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "test-admin@example.com",
        password: "admin123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("role", "Admin");

      adminToken = response.body.token;
    });
  });

  describe("Teacher Access Control", () => {
    it("should prevent teacher from accessing admin-only endpoints", async () => {
      // Try to create a teacher (admin-only operation)
      const response = await request(app)
        .post("/api/teachers")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          name: "New Teacher",
          email: "new-teacher@example.com",
          password: "password123",
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error", "Admin access required");
    });

    it("should prevent teacher from listing all teachers", async () => {
      const response = await request(app)
        .get("/api/teachers")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error", "Admin access required");
    });

    it("should prevent teacher from updating other teachers", async () => {
      const response = await request(app)
        .put(`/api/teachers/${teacherUser.id}`)
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          email: "updated@example.com",
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error", "Admin access required");
    });

    it("should prevent teacher from deleting teachers", async () => {
      const response = await request(app)
        .delete(`/api/teachers/${teacherUser.id}`)
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error", "Admin access required");
    });
  });

  describe("Admin Teacher Management", () => {
    let createdTeacherId: string;

    it("should allow admin to create teacher profile", async () => {
      const response = await request(app)
        .post("/api/teachers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Admin Created Teacher",
          email: "admin-created-teacher@example.com",
          password: "password123",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Admin Created Teacher");
      expect(response.body).toHaveProperty(
        "email",
        "admin-created-teacher@example.com"
      );

      createdTeacherId = response.body.id;
    });

    it("should allow admin to list all teachers", async () => {
      const response = await request(app)
        .get("/api/teachers")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it("should allow admin to get teacher details", async () => {
      const response = await request(app)
        .get(`/api/teachers/${createdTeacherId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", createdTeacherId);
      expect(response.body).toHaveProperty("name", "Admin Created Teacher");
    });

    it("should allow admin to update teacher email", async () => {
      const response = await request(app)
        .put(`/api/teachers/${createdTeacherId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "updated-teacher@example.com",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "email",
        "updated-teacher@example.com"
      );
    });

    it("should allow admin to update teacher password", async () => {
      const response = await request(app)
        .put(`/api/teachers/${createdTeacherId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          password: "newpassword123",
        });

      expect(response.status).toBe(200);

      // Verify new password works
      const loginResponse = await request(app).post("/api/auth/login").send({
        email: "updated-teacher@example.com",
        password: "newpassword123",
      });

      expect(loginResponse.status).toBe(200);
    });

    it("should allow admin to delete teacher", async () => {
      const response = await request(app)
        .delete(`/api/teachers/${createdTeacherId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(204);

      // Verify teacher is deleted
      const getResponse = await request(app)
        .get(`/api/teachers/${createdTeacherId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(getResponse.status).toBe(404);
    });

    it("should prevent admin from creating duplicate teacher email", async () => {
      const response = await request(app)
        .post("/api/teachers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicate Teacher",
          email: "test-teacher@example.com", // Already exists
          password: "password123",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Unauthenticated Access", () => {
    it("should prevent unauthenticated access to teacher endpoints", async () => {
      const response = await request(app).get("/api/teachers");

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Access token required");
    });

    it("should reject invalid tokens", async () => {
      const response = await request(app)
        .get("/api/teachers")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error", "Invalid token");
    });
  });
});
