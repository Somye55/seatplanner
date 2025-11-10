import request from "supertest";
import express from "express";
import { PrismaClient } from "../../generated/prisma/client";
import roomsRouter from "../routes/rooms";
import authRouter from "../routes/auth";

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);

const prisma = new PrismaClient();

describe("Seat Map Visibility Tests", () => {
  let adminToken: string;
  let teacherToken: string;
  let studentToken: string;
  let studentWithSeatToken: string;
  let testRoom: any;
  let testStudent: any;
  let testStudentWithSeat: any;

  beforeAll(async () => {
    // Create test users
    const adminUser = await prisma.user.create({
      data: {
        email: "admin-seatmap@test.com",
        password: "$2b$10$abcdefghijklmnopqrstuv", // hashed password
        role: "Admin",
      },
    });

    const teacherUser = await prisma.user.create({
      data: {
        email: "teacher-seatmap@test.com",
        password: "$2b$10$abcdefghijklmnopqrstuv",
        role: "Teacher",
      },
    });

    testStudent = await prisma.student.create({
      data: {
        name: "Test Student No Seat",
        email: "student-noseat@test.com",
        branch: "ConsultingClub",
        tags: [],
        accessibilityNeeds: [],
      },
    });

    const studentUser = await prisma.user.create({
      data: {
        email: "student-noseat@test.com",
        password: "$2b$10$abcdefghijklmnopqrstuv",
        role: "Student",
        studentId: testStudent.id,
      },
    });

    testStudentWithSeat = await prisma.student.create({
      data: {
        name: "Test Student With Seat",
        email: "student-withseat@test.com",
        branch: "ConsultingClub",
        tags: [],
        accessibilityNeeds: [],
      },
    });

    const studentWithSeatUser = await prisma.user.create({
      data: {
        email: "student-withseat@test.com",
        password: "$2b$10$abcdefghijklmnopqrstuv",
        role: "Student",
        studentId: testStudentWithSeat.id,
      },
    });

    // Create test location hierarchy
    const block = await prisma.block.create({
      data: { name: "Test Block", code: "TB-SM", distance: 0 },
    });

    const building = await prisma.building.create({
      data: {
        name: "Test Building",
        code: "TBD-SM",
        blockId: block.id,
        distance: 0,
      },
    });

    const floor = await prisma.floor.create({
      data: {
        buildingId: building.id,
        name: "Floor 1",
        number: 1,
        distance: 0,
      },
    });

    testRoom = await prisma.room.create({
      data: {
        buildingId: building.id,
        floorId: floor.id,
        name: "Test Room SM",
        capacity: 3,
        rows: 1,
        cols: 3,
      },
    });

    // Create seats
    const seat1 = await prisma.seat.create({
      data: {
        roomId: testRoom.id,
        label: "A1",
        row: 0,
        col: 0,
        status: "Available",
        features: [],
      },
    });

    const seat2 = await prisma.seat.create({
      data: {
        roomId: testRoom.id,
        label: "A2",
        row: 0,
        col: 1,
        status: "Allocated",
        features: [],
        studentId: testStudentWithSeat.id,
      },
    });

    const seat3 = await prisma.seat.create({
      data: {
        roomId: testRoom.id,
        label: "A3",
        row: 0,
        col: 2,
        status: "Broken",
        features: [],
      },
    });

    // Generate tokens (mock JWT for testing)
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: "Admin" },
      JWT_SECRET
    );
    teacherToken = jwt.sign(
      { id: teacherUser.id, email: teacherUser.email, role: "Teacher" },
      JWT_SECRET
    );
    studentToken = jwt.sign(
      { id: studentUser.id, email: studentUser.email, role: "Student" },
      JWT_SECRET
    );
    studentWithSeatToken = jwt.sign(
      {
        id: studentWithSeatUser.id,
        email: studentWithSeatUser.email,
        role: "Student",
      },
      JWT_SECRET
    );
  });

  afterAll(async () => {
    // Cleanup
    await prisma.seat.deleteMany({ where: { roomId: testRoom.id } });
    await prisma.room.deleteMany({ where: { name: "Test Room SM" } });
    await prisma.floor.deleteMany({ where: { name: "Floor 1" } });
    await prisma.building.deleteMany({ where: { code: "TBD-SM" } });
    await prisma.block.deleteMany({ where: { code: "TB-SM" } });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin-seatmap@test.com",
            "teacher-seatmap@test.com",
            "student-noseat@test.com",
            "student-withseat@test.com",
          ],
        },
      },
    });
    await prisma.student.deleteMany({
      where: {
        email: {
          in: ["student-noseat@test.com", "student-withseat@test.com"],
        },
      },
    });
    await prisma.$disconnect();
  });

  describe("GET /api/rooms/:id/seats - Admin Access", () => {
    it("should return all seats for admin", async () => {
      const response = await request(app)
        .get(`/api/rooms/${testRoom.id}/seats`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body.some((s: any) => s.label === "A1")).toBe(true);
      expect(response.body.some((s: any) => s.label === "A2")).toBe(true);
      expect(response.body.some((s: any) => s.label === "A3")).toBe(true);
    });
  });

  describe("GET /api/rooms/:id/seats - Teacher Access", () => {
    it("should return all seats for teacher", async () => {
      const response = await request(app)
        .get(`/api/rooms/${testRoom.id}/seats`)
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(3);
      expect(response.body.some((s: any) => s.label === "A1")).toBe(true);
      expect(response.body.some((s: any) => s.label === "A2")).toBe(true);
      expect(response.body.some((s: any) => s.label === "A3")).toBe(true);
    });
  });

  describe("GET /api/rooms/:id/seats - Student Access", () => {
    it("should return only student own seat if they have one in the room", async () => {
      const response = await request(app)
        .get(`/api/rooms/${testRoom.id}/seats`)
        .set("Authorization", `Bearer ${studentWithSeatToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].label).toBe("A2");
      expect(response.body[0].studentId).toBe(testStudentWithSeat.id);
    });

    it("should return empty array if student has no seat in the room", async () => {
      const response = await request(app)
        .get(`/api/rooms/${testRoom.id}/seats`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe("GET /api/rooms/:id/seats - Unauthenticated Access", () => {
    it("should return 401 for unauthenticated requests", async () => {
      const response = await request(app).get(
        `/api/rooms/${testRoom.id}/seats`
      );

      expect(response.status).toBe(401);
    });
  });
});
