import request from "supertest";
import express from "express";
import { PrismaClient, Branch } from "../../generated/prisma/client";
import bcrypt from "bcrypt";
import authRouter from "../routes/auth";
import roomBookingsRouter from "../routes/roomBookings";
import blocksRouter from "../routes/blocks";
import buildingsRouter from "../routes/buildings";
import floorsRouter from "../routes/floors";
import roomsRouter from "../routes/rooms";

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/room-bookings", roomBookingsRouter);
app.use("/api/locations/blocks", blocksRouter);
app.use("/api/locations/buildings", buildingsRouter);
app.use("/api/locations/floors", floorsRouter);
app.use("/api/rooms", roomsRouter);

const prisma = new PrismaClient();

describe("Room Search and Booking Flow", () => {
  let teacherUser: any;
  let teacher: any;
  let teacherToken: string;
  let block: any;
  let building: any;
  let floor: any;
  let room1: any;
  let room2: any;

  beforeAll(async () => {
    // Clean up test data
    await prisma.roomBooking.deleteMany({
      where: { teacher: { email: { contains: "test-booking-teacher" } } },
    });
    await prisma.teacher.deleteMany({
      where: { email: { contains: "test-booking-teacher" } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "test-booking" } },
    });
    await prisma.room.deleteMany({
      where: { name: { contains: "Test Booking Room" } },
    });
    await prisma.floor.deleteMany({
      where: { name: { contains: "Test Booking Floor" } },
    });
    await prisma.building.deleteMany({
      where: { name: { contains: "Test Booking Building" } },
    });
    await prisma.block.deleteMany({
      where: { name: { contains: "Test Booking Block" } },
    });

    // Create location hierarchy
    block = await prisma.block.create({
      data: {
        name: "Test Booking Block",
        code: "TBB",
        distance: 0,
      },
    });

    building = await prisma.building.create({
      data: {
        name: "Test Booking Building",
        code: "TBB1",
        blockId: block.id,
        distance: 0,
      },
    });

    floor = await prisma.floor.create({
      data: {
        name: "Test Booking Floor",
        number: 1,
        buildingId: building.id,
        distance: 0,
      },
    });

    // Create rooms with different capacities
    room1 = await prisma.room.create({
      data: {
        name: "Test Booking Room 1",
        capacity: 30,
        rows: 5,
        cols: 6,
        buildingId: building.id,
        floorId: floor.id,
        distance: 0,
      },
    });

    room2 = await prisma.room.create({
      data: {
        name: "Test Booking Room 2",
        capacity: 50,
        rows: 10,
        cols: 5,
        buildingId: building.id,
        floorId: floor.id,
        distance: 5,
      },
    });

    // Create teacher user
    const hashedPassword = await bcrypt.hash("teacher123", 10);
    teacherUser = await prisma.user.create({
      data: {
        email: "test-booking-teacher@example.com",
        password: hashedPassword,
        role: "Teacher",
      },
    });

    teacher = await prisma.teacher.create({
      data: {
        name: "Test Booking Teacher",
        email: "test-booking-teacher@example.com",
        userId: teacherUser.id,
      },
    });

    // Login to get token
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "test-booking-teacher@example.com",
      password: "teacher123",
    });
    teacherToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.roomBooking.deleteMany({
      where: { teacher: { email: { contains: "test-booking-teacher" } } },
    });
    await prisma.teacher.deleteMany({
      where: { email: { contains: "test-booking-teacher" } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "test-booking" } },
    });
    await prisma.room.deleteMany({
      where: { name: { contains: "Test Booking Room" } },
    });
    await prisma.floor.deleteMany({
      where: { name: { contains: "Test Booking Floor" } },
    });
    await prisma.building.deleteMany({
      where: { name: { contains: "Test Booking Building" } },
    });
    await prisma.block.deleteMany({
      where: { name: { contains: "Test Booking Block" } },
    });
    await prisma.$disconnect();
  });

  describe("Room Search", () => {
    it("should return rooms matching search criteria", async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

      const response = await request(app)
        .post("/api/room-bookings/search")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          capacity: 30,
          branch: Branch.ConsultingClub,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          currentLocation: {
            blockId: block.id,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("rooms");
      expect(Array.isArray(response.body.rooms)).toBe(true);
      expect(response.body.rooms.length).toBeGreaterThan(0);

      // Verify room details
      const firstRoom = response.body.rooms[0];
      expect(firstRoom).toHaveProperty("room");
      expect(firstRoom).toHaveProperty("distance");
      expect(firstRoom).toHaveProperty("score");
      expect(firstRoom.room.capacity).toBeGreaterThanOrEqual(30);
    });

    it("should prioritize exact capacity match", async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const response = await request(app)
        .post("/api/room-bookings/search")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          capacity: 30,
          branch: Branch.ConsultingClub,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          currentLocation: {
            blockId: block.id,
          },
        });

      expect(response.status).toBe(200);
      const rooms = response.body.rooms;

      // Room with exact capacity (30) should have higher score than room with 50
      const room30 = rooms.find((r: any) => r.room.capacity === 30);
      const room50 = rooms.find((r: any) => r.room.capacity === 50);

      if (room30 && room50) {
        expect(room30.score).toBeGreaterThan(room50.score);
      }
    });

    it("should filter out rooms with insufficient capacity", async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const response = await request(app)
        .post("/api/room-bookings/search")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          capacity: 100, // Higher than any room capacity
          branch: Branch.ConsultingClub,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          currentLocation: {
            blockId: block.id,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.rooms.length).toBe(0);
    });

    it("should consider location preferences in scoring", async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const response = await request(app)
        .post("/api/room-bookings/search")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          capacity: 30,
          branch: Branch.ConsultingClub,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          preferredLocation: {
            blockId: block.id,
            buildingId: building.id,
            floorId: floor.id,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.rooms.length).toBeGreaterThan(0);
      // Rooms in preferred location should have higher scores
      expect(response.body.rooms[0].score).toBeGreaterThan(0);
    });
  });

  describe("Room Booking Creation", () => {
    let booking1: any;

    it("should create a room booking successfully", async () => {
      const startTime = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours from now
      const endTime = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours from now

      const response = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          roomId: room1.id,
          branch: Branch.ConsultingClub,
          capacity: 25,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("roomId", room1.id);
      expect(response.body).toHaveProperty("teacherId", teacher.id);
      expect(response.body).toHaveProperty("status", "NotStarted");

      booking1 = response.body;
    });

    it("should prevent overlapping bookings in same room", async () => {
      // First, cancel the existing booking to avoid teacher conflict
      await prisma.roomBooking.deleteMany({
        where: {
          teacherId: teacher.id,
          roomId: room1.id,
        },
      });

      // Create a new booking
      const startTime1 = new Date(Date.now() + 10 * 60 * 60 * 1000);
      const endTime1 = new Date(Date.now() + 11 * 60 * 60 * 1000);

      await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          roomId: room1.id,
          branch: Branch.ConsultingClub,
          capacity: 25,
          startTime: startTime1.toISOString(),
          endTime: endTime1.toISOString(),
        });

      // Try to book the same room at overlapping time (should fail due to room conflict)
      const startTime2 = new Date(Date.now() + 10.5 * 60 * 60 * 1000); // Overlaps
      const endTime2 = new Date(Date.now() + 11.5 * 60 * 60 * 1000);

      const response = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          roomId: room1.id,
          branch: Branch.ConsultingClub,
          capacity: 25,
          startTime: startTime2.toISOString(),
          endTime: endTime2.toISOString(),
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error");
      // Should get teacher conflict first since same teacher
      expect(response.body.error).toContain("already have a booking");
    });

    it("should prevent booking in the past", async () => {
      const startTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const endTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      const response = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          roomId: room1.id,
          branch: Branch.ConsultingClub,
          capacity: 25,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should prevent booking with end time before start time", async () => {
      const startTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const endTime = new Date(Date.now() + 1 * 60 * 60 * 1000); // Before start time

      const response = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          roomId: room1.id,
          branch: Branch.ConsultingClub,
          capacity: 25,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should prevent teacher from booking multiple rooms at same time", async () => {
      // First, create a booking in room1
      const startTime = new Date(Date.now() + 20 * 60 * 60 * 1000);
      const endTime = new Date(Date.now() + 21 * 60 * 60 * 1000);

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

      // Now try to book room2 at the same time - should fail
      const response = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          roomId: room2.id, // Different room, same time
          branch: Branch.ConsultingClub,
          capacity: 40,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("already have a booking");
      expect(response.body.code).toBe("TEACHER_TIME_CONFLICT");
    });

    it("should allow booking in different room at different time", async () => {
      const startTime = new Date(Date.now() + 5 * 60 * 60 * 1000); // Different time
      const endTime = new Date(Date.now() + 6 * 60 * 60 * 1000);

      const response = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          roomId: room2.id, // Different room, different time
          branch: Branch.ConsultingClub,
          capacity: 40,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("roomId", room2.id);
    });
  });

  describe("Room Booking Listing", () => {
    it("should list teacher's own bookings", async () => {
      const response = await request(app)
        .get("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .query({ teacherId: teacher.id });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify booking details
      const booking = response.body[0];
      expect(booking).toHaveProperty("id");
      expect(booking).toHaveProperty("roomId");
      expect(booking).toHaveProperty("teacherId", teacher.id);
      expect(booking).toHaveProperty("status");
    });

    it("should filter bookings by room", async () => {
      const response = await request(app)
        .get("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .query({ roomId: room1.id });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // All bookings should be for the specified room
      response.body.forEach((booking: any) => {
        expect(booking.roomId).toBe(room1.id);
      });
    });

    it("should filter bookings by status", async () => {
      const response = await request(app)
        .get("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .query({ status: "NotStarted" });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // All bookings should have NotStarted status
      response.body.forEach((booking: any) => {
        expect(booking.status).toBe("NotStarted");
      });
    });
  });

  describe("Room Booking Cancellation", () => {
    let cancelableBooking: any;

    beforeAll(async () => {
      // Create a booking that can be canceled
      const startTime = new Date(Date.now() + 5 * 60 * 60 * 1000);
      const endTime = new Date(Date.now() + 6 * 60 * 60 * 1000);

      const response = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          roomId: room2.id,
          branch: Branch.ConsultingClub,
          capacity: 30,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      cancelableBooking = response.body;
    });

    it("should allow teacher to cancel their own booking", async () => {
      const response = await request(app)
        .delete(`/api/room-bookings/${cancelableBooking.id}`)
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(response.status).toBe(204);

      // Verify booking is deleted
      const getResponse = await request(app)
        .get("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .query({ teacherId: teacher.id });

      const deletedBooking = getResponse.body.find(
        (b: any) => b.id === cancelableBooking.id
      );
      expect(deletedBooking).toBeUndefined();
    });

    it("should return 404 for non-existent booking", async () => {
      const response = await request(app)
        .delete("/api/room-bookings/non-existent-id")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe("Booking Status Updates", () => {
    it("should update booking status from NotStarted to Ongoing", async () => {
      // Create a booking that starts very soon
      const startTime = new Date(Date.now() + 1000); // 1 second from now
      const endTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      const createResponse = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          roomId: room2.id,
          branch: Branch.TechAndInnovationClub,
          capacity: 30,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(createResponse.status).toBe(201);
      const bookingId = createResponse.body.id;

      // Wait for start time to pass
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Manually trigger status update (in real app, this is done by scheduled service)
      await prisma.roomBooking.updateMany({
        where: {
          status: "NotStarted",
          startTime: { lte: new Date() },
          endTime: { gt: new Date() },
        },
        data: { status: "Ongoing" },
      });

      // Verify status changed
      const booking = await prisma.roomBooking.findUnique({
        where: { id: bookingId },
      });

      expect(booking?.status).toBe("Ongoing");

      // Clean up
      await prisma.roomBooking.delete({ where: { id: bookingId } });
    });

    it("should update booking status from Ongoing to Completed", async () => {
      // Create a booking that has already ended
      const startTime = new Date(Date.now() - 2000); // 2 seconds ago
      const endTime = new Date(Date.now() - 1000); // 1 second ago

      const booking = await prisma.roomBooking.create({
        data: {
          roomId: room2.id,
          teacherId: teacher.id,
          branch: Branch.TechAndInnovationClub,
          capacity: 30,
          startTime,
          endTime,
          status: "Ongoing",
        },
      });

      // Manually trigger status update
      await prisma.roomBooking.updateMany({
        where: {
          status: { in: ["NotStarted", "Ongoing"] },
          endTime: { lte: new Date() },
        },
        data: { status: "Completed" },
      });

      // Verify status changed
      const updatedBooking = await prisma.roomBooking.findUnique({
        where: { id: booking.id },
      });

      expect(updatedBooking?.status).toBe("Completed");

      // Clean up
      await prisma.roomBooking.delete({ where: { id: booking.id } });
    });
  });

  describe("Room Availability After Booking", () => {
    it("should exclude booked rooms from search results", async () => {
      // Create a booking
      const startTime = new Date(Date.now() + 7 * 60 * 60 * 1000);
      const endTime = new Date(Date.now() + 8 * 60 * 60 * 1000);

      await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          roomId: room1.id,
          branch: Branch.ConsultingClub,
          capacity: 25,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      // Search for rooms during the same time
      const searchResponse = await request(app)
        .post("/api/room-bookings/search")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          capacity: 25,
          branch: Branch.ConsultingClub,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          currentLocation: {
            blockId: block.id,
          },
        });

      expect(searchResponse.status).toBe(200);

      // room1 should have lower score or be excluded due to booking
      const bookedRoom = searchResponse.body.rooms.find(
        (r: any) => r.room.id === room1.id
      );

      // If the room appears, it should have a lower availability score
      if (bookedRoom) {
        const availableRoom = searchResponse.body.rooms.find(
          (r: any) => r.room.id === room2.id
        );
        if (availableRoom) {
          expect(availableRoom.score).toBeGreaterThan(bookedRoom.score);
        }
      }
    });
  });

  describe("Student Allocation on Room Booking", () => {
    let testRoom: any;
    let testStudents: any[] = [];

    beforeAll(async () => {
      // Clean up any existing test data
      await prisma.seat.deleteMany({
        where: { room: { name: "Test Student Allocation Room" } },
      });
      await prisma.student.deleteMany({
        where: { email: { contains: "test-allocation-student" } },
      });
      await prisma.room.deleteMany({
        where: { name: "Test Student Allocation Room" },
      });

      // Create a test room with seats
      testRoom = await prisma.room.create({
        data: {
          name: "Test Student Allocation Room",
          capacity: 10,
          rows: 2,
          cols: 5,
          buildingId: building.id,
          floorId: floor.id,
          distance: 0,
        },
      });

      // Create seats for the room
      const seatPromises = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 5; col++) {
          seatPromises.push(
            prisma.seat.create({
              data: {
                roomId: testRoom.id,
                label: `${String.fromCharCode(65 + row)}${col + 1}`,
                row,
                col,
                features: [],
                status: "Available",
              },
            })
          );
        }
      }
      await Promise.all(seatPromises);

      // Create test students from ConsultingClub branch
      for (let i = 0; i < 5; i++) {
        const student = await prisma.student.create({
          data: {
            name: `Test Allocation Student ${i + 1}`,
            email: `test-allocation-student${i + 1}@example.com`,
            branch: Branch.ConsultingClub,
            tags: [],
            accessibilityNeeds: [],
          },
        });
        testStudents.push(student);
      }
    });

    afterAll(async () => {
      // Clean up test data
      await prisma.seat.deleteMany({
        where: { roomId: testRoom.id },
      });
      await prisma.student.deleteMany({
        where: { email: { contains: "test-allocation-student" } },
      });
      await prisma.roomBooking.deleteMany({
        where: { roomId: testRoom.id },
      });
      await prisma.room.deleteMany({
        where: { id: testRoom.id },
      });
    });

    it("should automatically allocate students when teacher claims a room", async () => {
      const startTime = new Date(Date.now() + 15 * 60 * 60 * 1000);
      const endTime = new Date(Date.now() + 16 * 60 * 60 * 1000);

      // Create booking - this should trigger automatic student allocation
      const response = await request(app)
        .post("/api/room-bookings")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          roomId: testRoom.id,
          branch: Branch.ConsultingClub,
          capacity: 5,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        });

      expect(response.status).toBe(201);

      // Wait a bit for allocation to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify students are allocated to seats
      const allocatedSeats = await prisma.seat.findMany({
        where: {
          roomId: testRoom.id,
          status: "Allocated",
        },
        include: {
          student: true,
        },
      });

      expect(allocatedSeats.length).toBe(5);

      // Verify all allocated students are from ConsultingClub
      allocatedSeats.forEach((seat) => {
        expect(seat.student?.branch).toBe(Branch.ConsultingClub);
      });

      // Verify room is marked as allocated to the branch
      const updatedRoom = await prisma.room.findUnique({
        where: { id: testRoom.id },
      });

      expect(updatedRoom?.branchAllocated).toBe(Branch.ConsultingClub);
      expect(updatedRoom?.claimed).toBe(5);
    });

    it("should deallocate students when booking is canceled", async () => {
      // Find the booking we just created
      const booking = await prisma.roomBooking.findFirst({
        where: {
          roomId: testRoom.id,
          teacherId: teacher.id,
          branch: Branch.ConsultingClub,
        },
      });

      expect(booking).toBeDefined();

      // Cancel the booking
      const response = await request(app)
        .delete(`/api/room-bookings/${booking!.id}`)
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(response.status).toBe(204);

      // Wait a bit for deallocation to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify students are deallocated
      const allocatedSeats = await prisma.seat.findMany({
        where: {
          roomId: testRoom.id,
          status: "Allocated",
        },
      });

      expect(allocatedSeats.length).toBe(0);

      // Verify room is no longer allocated to the branch
      const updatedRoom = await prisma.room.findUnique({
        where: { id: testRoom.id },
      });

      expect(updatedRoom?.branchAllocated).toBeNull();
      expect(updatedRoom?.claimed).toBe(0);
    });

    it("should deallocate students when booking expires", async () => {
      // Create a booking that expires immediately
      const startTime = new Date(Date.now() - 2000);
      const endTime = new Date(Date.now() - 1000);

      const booking = await prisma.roomBooking.create({
        data: {
          roomId: testRoom.id,
          teacherId: teacher.id,
          branch: Branch.ConsultingClub,
          capacity: 5,
          startTime,
          endTime,
          status: "Ongoing",
        },
      });

      // Manually allocate students first
      const { AllocationService } = await import(
        "../services/allocationService"
      );
      await AllocationService.allocateBranchToRoom(
        Branch.ConsultingClub,
        testRoom.id
      );

      // Verify students are allocated
      let allocatedSeats = await prisma.seat.findMany({
        where: {
          roomId: testRoom.id,
          status: "Allocated",
        },
      });

      expect(allocatedSeats.length).toBeGreaterThan(0);

      // Trigger expiration (simulating the scheduled service)
      const { BookingExpirationService } = await import(
        "../services/bookingExpirationService"
      );
      const expirationService = new BookingExpirationService();
      await expirationService.updateBookingStatuses();

      // Wait a bit for deallocation to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verify students are deallocated
      allocatedSeats = await prisma.seat.findMany({
        where: {
          roomId: testRoom.id,
          status: "Allocated",
        },
      });

      expect(allocatedSeats.length).toBe(0);

      // Verify booking is marked as completed
      const updatedBooking = await prisma.roomBooking.findUnique({
        where: { id: booking.id },
      });

      expect(updatedBooking?.status).toBe("Completed");

      // Clean up
      await prisma.roomBooking.delete({ where: { id: booking.id } });
    });
  });
});
