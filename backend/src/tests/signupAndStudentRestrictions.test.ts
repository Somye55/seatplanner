import request from "supertest";
import express from "express";
import { PrismaClient, Branch } from "../../generated/prisma/client";
import bcrypt from "bcrypt";
import authRouter from "../routes/auth";
import studentsRouter from "../routes/students";

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/students", studentsRouter);

const prisma = new PrismaClient();

describe("Signup Removal and Student Restrictions", () => {
  let adminUser: any;
  let adminToken: string;
  let testStudent: any;
  let testStudentUser: any;

  beforeAll(async () => {
    // Clean up test data
    await prisma.student.deleteMany({
      where: { email: { contains: "test-restriction" } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "test-restriction" } },
    });

    // Create admin user
    const hashedAdminPassword = await bcrypt.hash("admin123", 10);
    adminUser = await prisma.user.create({
      data: {
        email: "test-restriction-admin@example.com",
        password: hashedAdminPassword,
        role: "Admin",
      },
    });

    // Login to get admin token
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "test-restriction-admin@example.com",
      password: "admin123",
    });
    adminToken = loginResponse.body.token;

    // Create test student
    const hashedStudentPassword = await bcrypt.hash("student123", 10);
    testStudentUser = await prisma.user.create({
      data: {
        email: "test-restriction-student@example.com",
        password: hashedStudentPassword,
        role: "Student",
      },
    });

    testStudent = await prisma.student.create({
      data: {
        name: "Test Restriction Student",
        email: "test-restriction-student@example.com",
        branch: Branch.ConsultingClub,
        userId: testStudentUser.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.student.deleteMany({
      where: { email: { contains: "test-restriction" } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "test-restriction" } },
    });
    await prisma.$disconnect();
  });

  describe("Signup Endpoint Disabled", () => {
    it("should return 403 error when attempting to signup", async () => {
      const response = await request(app).post("/api/auth/signup").send({
        email: "newuser@example.com",
        password: "password123",
        role: "Student",
      });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("disabled");
      expect(response.body.error).toContain("administrator");
    });

    it("should return 403 for teacher signup attempt", async () => {
      const response = await request(app).post("/api/auth/signup").send({
        email: "newteacher@example.com",
        password: "password123",
        role: "Teacher",
      });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 403 for admin signup attempt", async () => {
      const response = await request(app).post("/api/auth/signup").send({
        email: "newadmin@example.com",
        password: "password123",
        role: "Admin",
      });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 403 even with valid data", async () => {
      const response = await request(app).post("/api/auth/signup").send({
        name: "Valid User",
        email: "validuser@example.com",
        password: "securepassword123",
        branch: Branch.ConsultingClub,
      });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 403 even with empty body", async () => {
      const response = await request(app).post("/api/auth/signup").send({});

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Student Name Editing Restrictions", () => {
    it("should prevent updating student name", async () => {
      const response = await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Updated Student Name",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("name");
      expect(response.body.error.toLowerCase()).toContain("cannot");
    });

    it("should allow updating student email", async () => {
      const response = await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "updated-restriction-student@example.com",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "email",
        "updated-restriction-student@example.com"
      );
      expect(response.body).toHaveProperty("name", "Test Restriction Student"); // Name unchanged
    });

    it("should allow updating student password", async () => {
      const response = await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          password: "newpassword123",
        });

      expect(response.status).toBe(200);

      // Verify new password works
      const loginResponse = await request(app).post("/api/auth/login").send({
        email: "updated-restriction-student@example.com",
        password: "newpassword123",
      });

      expect(loginResponse.status).toBe(200);
    });

    it("should allow updating student branch", async () => {
      const response = await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          branch: Branch.TechAndInnovationClub,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "branch",
        Branch.TechAndInnovationClub
      );
      expect(response.body).toHaveProperty("name", "Test Restriction Student"); // Name unchanged
    });

    it("should allow updating student accessibility needs", async () => {
      const response = await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          accessibilityNeeds: ["wheelchair_access", "front_seat"],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("accessibilityNeeds");
      expect(response.body.accessibilityNeeds).toContain("wheelchair_access");
      expect(response.body.accessibilityNeeds).toContain("front_seat");
      expect(response.body).toHaveProperty("name", "Test Restriction Student"); // Name unchanged
    });

    it("should prevent name update even when combined with other fields", async () => {
      const response = await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Sneaky Name Change",
          email: "another-email@example.com",
          branch: Branch.InvestmentBankingClub,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("name");

      // Verify name was not changed
      const student = await prisma.student.findUnique({
        where: { id: testStudent.id },
      });
      expect(student?.name).toBe("Test Restriction Student");
    });

    it("should allow updating multiple fields except name", async () => {
      const response = await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          email: "multi-update@example.com",
          branch: Branch.EntrepreneurshipCell,
          accessibilityNeeds: ["aisle_seat"],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("email", "multi-update@example.com");
      expect(response.body).toHaveProperty(
        "branch",
        Branch.EntrepreneurshipCell
      );
      expect(response.body.accessibilityNeeds).toContain("aisle_seat");
      expect(response.body).toHaveProperty("name", "Test Restriction Student"); // Name unchanged
    });

    it("should return error with clear message about name restriction", async () => {
      const response = await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Another Name Change Attempt",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");

      const errorMessage = response.body.error.toLowerCase();
      expect(errorMessage).toMatch(
        /name.*cannot.*modif|cannot.*modif.*name|name.*not.*edit/
      );
    });
  });

  describe("Student Creation Still Works", () => {
    it("should allow admin to create new student with name", async () => {
      const response = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "New Test Student",
          email: "new-test-restriction-student@example.com",
          password: "password123",
          branch: Branch.ConsultingClub,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "New Test Student");
      expect(response.body).toHaveProperty(
        "email",
        "new-test-restriction-student@example.com"
      );

      // Clean up
      await prisma.student.delete({ where: { id: response.body.id } });
      await prisma.user.delete({
        where: { email: "new-test-restriction-student@example.com" },
      });
    });
  });

  describe("Login Still Works After Signup Removal", () => {
    it("should allow existing users to login", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "multi-update@example.com",
        password: "newpassword123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("role", "Student");
    });

    it("should allow admin to login", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "test-restriction-admin@example.com",
        password: "admin123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("role", "Admin");
    });

    it("should reject invalid credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "multi-update@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Invalid credentials");
    });
  });

  describe("Signup Page Accessibility", () => {
    it("should verify signup endpoint is consistently disabled", async () => {
      // Test multiple times to ensure consistency
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post("/api/auth/signup")
          .send({
            email: `test${i}@example.com`,
            password: "password123",
          });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty("error");
      }
    });

    it("should not create any users through signup endpoint", async () => {
      const beforeCount = await prisma.user.count();

      await request(app).post("/api/auth/signup").send({
        email: "shouldnotbecreated@example.com",
        password: "password123",
        role: "Student",
      });

      const afterCount = await prisma.user.count();

      expect(afterCount).toBe(beforeCount);

      // Verify user was not created
      const user = await prisma.user.findUnique({
        where: { email: "shouldnotbecreated@example.com" },
      });
      expect(user).toBeNull();
    });
  });

  describe("Error Messages", () => {
    it("should provide helpful error message for signup attempts", async () => {
      const response = await request(app).post("/api/auth/signup").send({
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain("administrator");
      expect(response.body.error.toLowerCase()).toContain("contact");
    });

    it("should provide clear error message for name update attempts", async () => {
      const response = await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "New Name",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
      expect(response.body.error.length).toBeGreaterThan(10); // Should be a meaningful message
    });
  });

  describe("Data Integrity", () => {
    it("should maintain student data integrity after failed name update", async () => {
      const beforeStudent = await prisma.student.findUnique({
        where: { id: testStudent.id },
      });

      await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Should Not Change",
        });

      const afterStudent = await prisma.student.findUnique({
        where: { id: testStudent.id },
      });

      expect(afterStudent?.name).toBe(beforeStudent?.name);
      expect(afterStudent?.email).toBe(beforeStudent?.email);
      expect(afterStudent?.branch).toBe(beforeStudent?.branch);
    });

    it("should not affect other students when one update fails", async () => {
      // Create another student
      const hashedPassword = await bcrypt.hash("password123", 10);
      const user2 = await prisma.user.create({
        data: {
          email: "test-restriction-student2@example.com",
          password: hashedPassword,
          role: "Student",
        },
      });

      const student2 = await prisma.student.create({
        data: {
          name: "Test Student 2",
          email: "test-restriction-student2@example.com",
          branch: Branch.ConsultingClub,
          userId: user2.id,
        },
      });

      // Try to update first student's name (should fail)
      await request(app)
        .put(`/api/students/${testStudent.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Failed Update",
        });

      // Verify second student is unaffected
      const unchangedStudent = await prisma.student.findUnique({
        where: { id: student2.id },
      });

      expect(unchangedStudent?.name).toBe("Test Student 2");

      // Clean up
      await prisma.student.delete({ where: { id: student2.id } });
      await prisma.user.delete({ where: { id: user2.id } });
    });
  });
});
