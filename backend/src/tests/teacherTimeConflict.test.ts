import request from "supertest";
import express from "express";
import { PrismaClient, Branch } from "../../generated/prisma/client";
import bcrypt from "bcrypt";
import authRouter from "../routes/auth";
import roomBookingsRouter from "../routes/roomBookings";

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/room-bookings", roomBookingsRouter);

const prisma = new PrismaClient();

describe("Teacher Time Conflict Prevention", () => {
  let teacherToken: string;
  let teacher: any;
  let room1: any;
  let room2: any;

  beforeAll(async () => {
    // Clean up
    await prisma.roomBooking.deleteMany({
      where: { teacher: { email: "conflict-test-teacher@example.com" } },
    });
    await prisma.teacher.deleteMany({
      where: { email: "conflict-test-teacher@example.com" },
    });
    await prisma.user.deleteMany({
      where: { email: "conflict-test-teacher@example.com" },
    });

    // Create test rooms
    const block = await prisma.block.upsert({
      where: { code: "CONFLICT-TEST" },
      update: {},
      create: { name: "Conflict Test Block", code: "CONFLICT-TEST" },
    });

    const building = await prisma.building.upsert({
      where: { code: "CONFLICT-TEST-B1" },
      update: {},
      create: {
        name: "Conflict Test Building",
        code: "CONFLICT-TEST-B1",
        blockId: block.id,
      },
    });

    let floor = await prisma.floor.findFirst({
      where: { buildingId: building.id },
    });

    if (!floor) {
      floor = await prisma.floor.create({
        data: {
          name: "Floor 1",
          number: 1,
          buildingId: building.id,
        },
      });
    }

    // Find or create rooms
    room1 = await prisma.room.findFirst({
      where: { name: "Conflict Test Room 1", buildingId: building.id },
    });

    if (!room1) {
      room1 = await prisma.room.create({
        data: {
          name: "Conflict Test Room 1",
          capacity: 30,
          rows: 5,
          cols: 6,
          buildingId: building.id,
          floorId: floor.id,
        },
      });
    }

    room2 = await prisma.room.findFirst({
      where: { name: "Conflict Test Room 2", buildingId: building.id },
    });

    if (!room2) {
      room2 = await prisma.room.create({
        data: {
          name: "Conflict Test Room 2",
          capacity: 40,
          rows: 8,
          cols: 5,
          buildingId: building.id,
          floorId: floor.id,
        },
      });
    }

    // Create teacher
    const hashedPassword = await bcrypt.hash("teacher123", 10);
    const user = await prisma.user.create({
      data: {
        email: "conflict-test-teacher@example.com",
        password: hashedPassword,
        role: "Teacher",
      },
    });

    teacher = await prisma.teacher.create({
      data: {
        name: "Conflict Test Teacher",
        email: "conflict-test-teacher@example.com",
        userId: user.id,
      },
    });

    // Login
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "conflict-test-teacher@example.com",
      password: "teacher123",
    });
    teacherToken = loginResponse.body.token;
  }, 15000);

  afterAll(async () => {
    await prisma.roomBooking.deleteMany({
      where: { teacher: { email: "conflict-test-teacher@example.com" } },
    });
    await prisma.teacher.deleteMany({
      where: { email: "conflict-test-teacher@example.com" },
    });
    await prisma.user.deleteMany({
      where: { email: "conflict-test-teacher@example.com" },
    });
    await prisma.$disconnect();
  }, 10000);

  it("should prevent teacher from booking two rooms at the same time", async () => {
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    const endTime = new Date(Date.now() + 25 * 60 * 60 * 1000); // 25 hours from now

    // First booking should succeed
    const firstBooking = await request(app)
      .post("/api/room-bookings")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        roomId: room1.id,
        branch: Branch.ConsultingClub,
        capacity: 25,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

    expect(firstBooking.status).toBe(201);
    expect(firstBooking.body).toHaveProperty("id");

    // Second booking at same time should fail
    const secondBooking = await request(app)
      .post("/api/room-bookings")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        roomId: room2.id, // Different room
        branch: Branch.ConsultingClub,
        capacity: 30,
        startTime: startTime.toISOString(), // Same time
        endTime: endTime.toISOString(), // Same time
      });

    expect(secondBooking.status).toBe(409);
    expect(secondBooking.body).toHaveProperty("error");
    expect(secondBooking.body.error).toContain("already have a booking");
    expect(secondBooking.body.code).toBe("TEACHER_TIME_CONFLICT");
  });

  it("should allow teacher to book different rooms at different times", async () => {
    const startTime1 = new Date(Date.now() + 26 * 60 * 60 * 1000);
    const endTime1 = new Date(Date.now() + 27 * 60 * 60 * 1000);

    const startTime2 = new Date(Date.now() + 28 * 60 * 60 * 1000); // Different time
    const endTime2 = new Date(Date.now() + 29 * 60 * 60 * 1000);

    // First booking
    const firstBooking = await request(app)
      .post("/api/room-bookings")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        roomId: room1.id,
        branch: Branch.TechAndInnovationClub,
        capacity: 25,
        startTime: startTime1.toISOString(),
        endTime: endTime1.toISOString(),
      });

    expect(firstBooking.status).toBe(201);

    // Second booking at different time should succeed
    const secondBooking = await request(app)
      .post("/api/room-bookings")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        roomId: room2.id,
        branch: Branch.TechAndInnovationClub,
        capacity: 30,
        startTime: startTime2.toISOString(),
        endTime: endTime2.toISOString(),
      });

    expect(secondBooking.status).toBe(201);
    expect(secondBooking.body).toHaveProperty("id");
  });

  it("should detect partial time overlap", async () => {
    const startTime1 = new Date(Date.now() + 30 * 60 * 60 * 1000);
    const endTime1 = new Date(Date.now() + 32 * 60 * 60 * 1000);

    const startTime2 = new Date(Date.now() + 31 * 60 * 60 * 1000); // Overlaps
    const endTime2 = new Date(Date.now() + 33 * 60 * 60 * 1000);

    // First booking
    const firstBooking = await request(app)
      .post("/api/room-bookings")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        roomId: room1.id,
        branch: Branch.EntrepreneurshipCell,
        capacity: 25,
        startTime: startTime1.toISOString(),
        endTime: endTime1.toISOString(),
      });

    expect(firstBooking.status).toBe(201);

    // Second booking with partial overlap should fail
    const secondBooking = await request(app)
      .post("/api/room-bookings")
      .set("Authorization", `Bearer ${teacherToken}`)
      .send({
        roomId: room2.id,
        branch: Branch.EntrepreneurshipCell,
        capacity: 30,
        startTime: startTime2.toISOString(),
        endTime: endTime2.toISOString(),
      });

    expect(secondBooking.status).toBe(409);
    expect(secondBooking.body.code).toBe("TEACHER_TIME_CONFLICT");
  });
});
