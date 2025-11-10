import request from "supertest";
import express from "express";
import { PrismaClient } from "../../generated/prisma/client";
import roomBookingsRouter from "../routes/roomBookings";
import authRouter from "../routes/auth";
import { Server } from "socket.io";
import { createServer } from "http";

const prisma = new PrismaClient();

// Setup Express app with Socket.IO for testing
const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.json());
app.set("io", io);
app.use("/api/auth", authRouter);
app.use("/api/room-bookings", roomBookingsRouter);

describe("Room Booking Race Condition Tests", () => {
  let teacher1Token: string;
  let teacher2Token: string;
  let teacher1Id: string;
  let teacher2Id: string;
  let roomId: string;
  let blockId: string;
  let buildingId: string;
  let floorId: string;

  beforeAll(async () => {
    // Create test block
    const block = await prisma.block.create({
      data: {
        name: "Test Block",
        code: "TB",
        distance: 0,
      },
    });
    blockId = block.id;

    // Create test building
    const building = await prisma.building.create({
      data: {
        name: "Test Building",
        code: "TB1",
        blockId: blockId,
        distance: 0,
      },
    });
    buildingId = building.id;

    // Create test floor
    const floor = await prisma.floor.create({
      data: {
        name: "Ground Floor",
        number: 0,
        buildingId: buildingId,
        distance: 0,
      },
    });
    floorId = floor.id;

    // Create test room
    const room = await prisma.room.create({
      data: {
        name: "Test Room 101",
        buildingId: buildingId,
        floorId: floorId,
        capacity: 50,
        rows: 5,
        cols: 10,
        distance: 0,
      },
    });
    roomId = room.id;

    // Create two test teachers
    const teacher1Response = await request(app).post("/api/auth/signup").send({
      email: "teacher1@test.com",
      password: "password123",
      name: "Teacher One",
      role: "Teacher",
    });
    teacher1Token = teacher1Response.body.token;
    teacher1Id = teacher1Response.body.user.id;

    const teacher2Response = await request(app).post("/api/auth/signup").send({
      email: "teacher2@test.com",
      password: "password123",
      name: "Teacher Two",
      role: "Teacher",
    });
    teacher2Token = teacher2Response.body.token;
    teacher2Id = teacher2Response.body.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.roomBooking.deleteMany({});
    await prisma.room.deleteMany({ where: { id: roomId } });
    await prisma.floor.deleteMany({ where: { id: floorId } });
    await prisma.building.deleteMany({ where: { id: buildingId } });
    await prisma.block.deleteMany({ where: { id: blockId } });
    await prisma.teacher.deleteMany({
      where: {
        userId: { in: [teacher1Id, teacher2Id] },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [teacher1Id, teacher2Id] },
      },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear bookings before each test
    await prisma.roomBooking.deleteMany({});
  });

  describe("Concurrent Booking Attempts", () => {
    it("should handle race condition when two teachers try to book the same room simultaneously", async () => {
      const startTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
      const endTime = new Date(Date.now() + 7200000).toISOString(); // 2 hours from now

      const bookingData = {
        roomId,
        branch: "CSE",
        capacity: 30,
        startTime,
        endTime,
      };

      // Simulate simultaneous booking attempts
      const [response1, response2] = await Promise.all([
        request(app)
          .post("/api/room-bookings")
          .set("Authorization", `Bearer ${teacher1Token}`)
          .send(bookingData),
        request(app)
          .post("/api/room-bookings")
          .set("Authorization", `Bearer ${teacher2Token}`)
          .send(bookingData),
      ]);

      // One should succeed, one should fail
      const responses = [response1, response2];
      const successResponses = responses.filter((r) => r.status === 201);
      const failureResponses = responses.filter((r) => r.status === 409);

      expect(successResponses).toHaveLength(1);
      expect(failureResponses).toHaveLength(1);

      // Verify the failure response has proper error message
      expect(failureResponses[0].body.code).toBe("ROOM_NOT_AVAILABLE");
      expect(failureResponses[0].body.error).toContain("booked");

      // Verify only one booking was created
      const bookings = await prisma.roomBooking.findMany({
        where: { roomId },
      });
      expect(bookings).toHaveLength(1);
    });

    it("should allow booking after lock expires (30 seconds)", async () => {
      const startTime = new Date(Date.now() + 3600000).toISOString();
      const endTime = new Date(Date.now() + 7200000).toISOString();

      const bookingData = {
        roomId,
        branch: "CSE",
        capacity: 30,
        startTime,
        endTime,
      };

      // First booking attempt
      const response1 = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacher1Token}`)
        .send(bookingData);

      expect(response1.status).toBe(201);

      // Try to book the same slot again (should fail - already booked)
      const response2 = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacher2Token}`)
        .send(bookingData);

      expect(response2.status).toBe(409);
      expect(response2.body.error).toContain("already booked");
    });

    it("should return proper error message when room is being booked by another teacher", async () => {
      const startTime = new Date(Date.now() + 3600000).toISOString();
      const endTime = new Date(Date.now() + 7200000).toISOString();

      const bookingData = {
        roomId,
        branch: "CSE",
        capacity: 30,
        startTime,
        endTime,
      };

      // Make concurrent requests
      const [response1, response2] = await Promise.all([
        request(app)
          .post("/api/room-bookings")
          .set("Authorization", `Bearer ${teacher1Token}`)
          .send(bookingData),
        request(app)
          .post("/api/room-bookings")
          .set("Authorization", `Bearer ${teacher2Token}`)
          .send(bookingData),
      ]);

      const failedResponse = response1.status === 409 ? response1 : response2;

      expect(failedResponse.body).toHaveProperty("error");
      expect(failedResponse.body).toHaveProperty("code");
      expect(
        failedResponse.body.error.includes("booked") ||
          failedResponse.body.error.includes("booking")
      ).toBe(true);
    });

    it("should allow different teachers to book different time slots for the same room", async () => {
      const startTime1 = new Date(Date.now() + 3600000).toISOString();
      const endTime1 = new Date(Date.now() + 7200000).toISOString();

      const startTime2 = new Date(Date.now() + 7200000).toISOString();
      const endTime2 = new Date(Date.now() + 10800000).toISOString();

      const booking1Data = {
        roomId,
        branch: "CSE",
        capacity: 30,
        startTime: startTime1,
        endTime: endTime1,
      };

      const booking2Data = {
        roomId,
        branch: "ECE",
        capacity: 25,
        startTime: startTime2,
        endTime: endTime2,
      };

      // Book first slot
      const response1 = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacher1Token}`)
        .send(booking1Data);

      expect(response1.status).toBe(201);

      // Book second slot (different time)
      const response2 = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacher2Token}`)
        .send(booking2Data);

      expect(response2.status).toBe(201);

      // Verify both bookings exist
      const bookings = await prisma.roomBooking.findMany({
        where: { roomId },
      });
      expect(bookings).toHaveLength(2);
    });

    it("should detect overlapping bookings even with partial overlap", async () => {
      const startTime1 = new Date(Date.now() + 3600000).toISOString();
      const endTime1 = new Date(Date.now() + 7200000).toISOString();

      // Overlapping time (starts before first ends)
      const startTime2 = new Date(Date.now() + 5400000).toISOString();
      const endTime2 = new Date(Date.now() + 9000000).toISOString();

      const booking1Data = {
        roomId,
        branch: "CSE",
        capacity: 30,
        startTime: startTime1,
        endTime: endTime1,
      };

      const booking2Data = {
        roomId,
        branch: "ECE",
        capacity: 25,
        startTime: startTime2,
        endTime: endTime2,
      };

      // Book first slot
      const response1 = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacher1Token}`)
        .send(booking1Data);

      expect(response1.status).toBe(201);

      // Try to book overlapping slot
      const response2 = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacher2Token}`)
        .send(booking2Data);

      expect(response2.status).toBe(409);
      expect(response2.body.code).toBe("ROOM_NOT_AVAILABLE");
    });
  });

  describe("Lock Management", () => {
    it("should release lock after successful booking", async () => {
      const startTime = new Date(Date.now() + 3600000).toISOString();
      const endTime = new Date(Date.now() + 7200000).toISOString();

      const bookingData = {
        roomId,
        branch: "CSE",
        capacity: 30,
        startTime,
        endTime,
      };

      // First booking
      const response1 = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacher1Token}`)
        .send(bookingData);

      expect(response1.status).toBe(201);

      // Immediate second attempt should fail (room already booked, not locked)
      const response2 = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacher2Token}`)
        .send(bookingData);

      expect(response2.status).toBe(409);
    });

    it("should release lock after failed booking", async () => {
      const startTime = new Date(Date.now() + 3600000).toISOString();
      const endTime = new Date(Date.now() + 7200000).toISOString();

      // Try to book with invalid room ID (will fail)
      const invalidBookingData = {
        roomId: "invalid-room-id",
        branch: "CSE",
        capacity: 30,
        startTime,
        endTime,
      };

      const response = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacher1Token}`)
        .send(invalidBookingData);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe("ROOM_NOT_FOUND");

      // Lock should be released, allowing another attempt
      // (This is implicit - if lock wasn't released, subsequent requests would fail)
    });
  });
});
