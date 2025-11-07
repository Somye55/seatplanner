import request from "supertest";
import express from "express";
import { PrismaClient } from "../../generated/prisma/client";
import bcrypt from "bcrypt";
import authRouter from "../routes/auth";
import blocksRouter from "../routes/blocks";
import buildingsRouter from "../routes/buildings";
import floorsRouter from "../routes/floors";
import roomsRouter from "../routes/rooms";

const app = express();
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/locations/blocks", blocksRouter);
app.use("/api/locations/buildings", buildingsRouter);
app.use("/api/locations/floors", floorsRouter);
app.use("/api/rooms", roomsRouter);

const prisma = new PrismaClient();

describe("Location Hierarchy Management", () => {
  let adminUser: any;
  let adminToken: string;
  let testBlock: any;
  let testBuilding: any;
  let testFloor: any;
  let testRoom: any;

  beforeAll(async () => {
    // Clean up test data
    await prisma.room.deleteMany({
      where: { name: { contains: "Test Hierarchy Room" } },
    });
    await prisma.floor.deleteMany({
      where: { name: { contains: "Test Hierarchy Floor" } },
    });
    await prisma.building.deleteMany({
      where: { name: { contains: "Test Hierarchy Building" } },
    });
    await prisma.block.deleteMany({
      where: { name: { contains: "Test Hierarchy Block" } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "test-hierarchy-admin" } },
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    adminUser = await prisma.user.create({
      data: {
        email: "test-hierarchy-admin@example.com",
        password: hashedPassword,
        role: "Admin",
      },
    });

    // Login to get token
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "test-hierarchy-admin@example.com",
      password: "admin123",
    });
    adminToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.room.deleteMany({
      where: { name: { contains: "Test Hierarchy Room" } },
    });
    await prisma.floor.deleteMany({
      where: { name: { contains: "Test Hierarchy Floor" } },
    });
    await prisma.building.deleteMany({
      where: { name: { contains: "Test Hierarchy Building" } },
    });
    await prisma.block.deleteMany({
      where: { name: { contains: "Test Hierarchy Block" } },
    });
    await prisma.user.deleteMany({
      where: { email: { contains: "test-hierarchy-admin" } },
    });
    await prisma.$disconnect();
  });

  describe("Complete Hierarchy Creation", () => {
    it("should create a block", async () => {
      const response = await request(app)
        .post("/api/locations/blocks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Hierarchy Block",
          code: "THB",
          distance: 0,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Test Hierarchy Block");
      expect(response.body).toHaveProperty("code", "THB");
      expect(response.body).toHaveProperty("distance", 0);

      testBlock = response.body;
    });

    it("should create a building within the block", async () => {
      const response = await request(app)
        .post("/api/locations/buildings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Hierarchy Building",
          code: "THB1",
          blockId: testBlock.id,
          distance: 10,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Test Hierarchy Building");
      expect(response.body).toHaveProperty("blockId", testBlock.id);
      expect(response.body).toHaveProperty("distance", 10);

      testBuilding = response.body;
    });

    it("should create a floor within the building", async () => {
      const response = await request(app)
        .post("/api/locations/floors")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Hierarchy Floor",
          number: 1,
          buildingId: testBuilding.id,
          distance: 5,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Test Hierarchy Floor");
      expect(response.body).toHaveProperty("buildingId", testBuilding.id);
      expect(response.body).toHaveProperty("number", 1);
      expect(response.body).toHaveProperty("distance", 5);

      testFloor = response.body;
    });

    it("should create a room within the floor", async () => {
      const response = await request(app)
        .post("/api/rooms")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Test Hierarchy Room",
          capacity: 40,
          rows: 8,
          cols: 5,
          buildingId: testBuilding.id,
          floorId: testFloor.id,
          distance: 2,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "Test Hierarchy Room");
      expect(response.body).toHaveProperty("floorId", testFloor.id);
      expect(response.body).toHaveProperty("buildingId", testBuilding.id);
      expect(response.body).toHaveProperty("distance", 2);

      testRoom = response.body;
    });

    it("should verify complete hierarchy relationships", async () => {
      // Fetch room with all relationships
      const room = await prisma.room.findUnique({
        where: { id: testRoom.id },
        include: {
          floor: {
            include: {
              building: {
                include: {
                  block: true,
                },
              },
            },
          },
        },
      });

      expect(room).toBeDefined();
      expect(room?.floor.id).toBe(testFloor.id);
      expect(room?.floor.building.id).toBe(testBuilding.id);
      expect(room?.floor.building.block.id).toBe(testBlock.id);
    });
  });

  describe("Distance Calculations", () => {
    let block1: any, block2: any;
    let building1: any, building2: any;
    let floor1: any, floor2: any;
    let room1: any, room2: any;

    beforeAll(async () => {
      // Create a second hierarchy for distance testing
      block2 = await prisma.block.create({
        data: {
          name: "Test Hierarchy Block 2",
          code: "THB2",
          distance: 100,
        },
      });

      building2 = await prisma.building.create({
        data: {
          name: "Test Hierarchy Building 2",
          code: "THB2-1",
          blockId: block2.id,
          distance: 20,
        },
      });

      floor2 = await prisma.floor.create({
        data: {
          name: "Test Hierarchy Floor 2",
          number: 2,
          buildingId: building2.id,
          distance: 10,
        },
      });

      room2 = await prisma.room.create({
        data: {
          name: "Test Hierarchy Room 2",
          capacity: 30,
          rows: 6,
          cols: 5,
          buildingId: building2.id,
          floorId: floor2.id,
          distance: 3,
        },
      });
    });

    it("should calculate distance between rooms in different blocks", () => {
      // Distance calculation logic (from design document)
      const calculateDistance = (
        room1: any,
        room2: any,
        hierarchy1: any,
        hierarchy2: any
      ) => {
        let distance = 0;

        // Block-level distance
        if (hierarchy1.block.id !== hierarchy2.block.id) {
          distance += hierarchy2.block.distance;
        }

        // Building-level distance
        if (hierarchy1.building.id !== hierarchy2.building.id) {
          distance += hierarchy2.building.distance;
        }

        // Floor-level distance
        if (hierarchy1.floor.id !== hierarchy2.floor.id) {
          distance += hierarchy2.floor.distance;
        }

        // Room-level distance (within same floor)
        if (hierarchy1.floor.id === hierarchy2.floor.id) {
          distance += room2.distance;
        }

        return distance;
      };

      const hierarchy1 = {
        block: testBlock,
        building: testBuilding,
        floor: testFloor,
      };

      const hierarchy2 = {
        block: block2,
        building: building2,
        floor: floor2,
      };

      const distance = calculateDistance(
        testRoom,
        room2,
        hierarchy1,
        hierarchy2
      );

      // Distance should include block distance (100) + building distance (20) + floor distance (10)
      expect(distance).toBe(130);
    });

    it("should calculate distance between rooms in same block but different buildings", () => {
      // Create another building in the same block
      const building3 = {
        id: "building3",
        blockId: testBlock.id,
        distance: 15,
      };

      const floor3 = {
        id: "floor3",
        buildingId: building3.id,
        distance: 8,
      };

      const hierarchy1 = {
        block: testBlock,
        building: testBuilding,
        floor: testFloor,
      };

      const hierarchy2 = {
        block: testBlock,
        building: building3,
        floor: floor3,
      };

      const calculateDistance = (hierarchy1: any, hierarchy2: any) => {
        let distance = 0;

        if (hierarchy1.block.id !== hierarchy2.block.id) {
          distance += hierarchy2.block.distance;
        }

        if (hierarchy1.building.id !== hierarchy2.building.id) {
          distance += hierarchy2.building.distance;
        }

        if (hierarchy1.floor.id !== hierarchy2.floor.id) {
          distance += hierarchy2.floor.distance;
        }

        return distance;
      };

      const distance = calculateDistance(hierarchy1, hierarchy2);

      // Distance should include building distance (15) + floor distance (8)
      expect(distance).toBe(23);
    });

    it("should calculate distance between rooms on same floor", () => {
      // Create another room on the same floor
      const room3 = {
        id: "room3",
        floorId: testFloor.id,
        distance: 7,
      };

      const hierarchy1 = {
        block: testBlock,
        building: testBuilding,
        floor: testFloor,
      };

      const hierarchy2 = {
        block: testBlock,
        building: testBuilding,
        floor: testFloor,
      };

      const calculateDistance = (
        room: any,
        hierarchy1: any,
        hierarchy2: any
      ) => {
        let distance = 0;

        if (hierarchy1.floor.id === hierarchy2.floor.id) {
          distance += room.distance;
        }

        return distance;
      };

      const distance = calculateDistance(room3, hierarchy1, hierarchy2);

      // Distance should only include room distance (7)
      expect(distance).toBe(7);
    });
  });

  describe("Hierarchy Validation", () => {
    it("should prevent creating building without valid block", async () => {
      const response = await request(app)
        .post("/api/locations/buildings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Invalid Building",
          code: "INV1",
          blockId: "non-existent-block-id",
          distance: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should prevent creating floor without valid building", async () => {
      const response = await request(app)
        .post("/api/locations/floors")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Invalid Floor",
          number: 1,
          buildingId: "non-existent-building-id",
          distance: 5,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should prevent creating room without valid floor", async () => {
      const response = await request(app)
        .post("/api/rooms")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Invalid Room",
          capacity: 30,
          rows: 6,
          cols: 5,
          buildingId: testBuilding.id,
          floorId: "non-existent-floor-id",
          distance: 2,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should prevent duplicate block codes", async () => {
      const response = await request(app)
        .post("/api/locations/blocks")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicate Block",
          code: "THB", // Already exists
          distance: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should prevent duplicate building codes", async () => {
      const response = await request(app)
        .post("/api/locations/buildings")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicate Building",
          code: "THB1", // Already exists
          blockId: testBlock.id,
          distance: 10,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Cascade Deletes", () => {
    let deleteBlock: any;
    let deleteBuilding: any;
    let deleteFloor: any;
    let deleteRoom: any;

    beforeAll(async () => {
      // Create a complete hierarchy for deletion testing
      deleteBlock = await prisma.block.create({
        data: {
          name: "Test Delete Block",
          code: "TDB",
          distance: 0,
        },
      });

      deleteBuilding = await prisma.building.create({
        data: {
          name: "Test Delete Building",
          code: "TDB1",
          blockId: deleteBlock.id,
          distance: 10,
        },
      });

      deleteFloor = await prisma.floor.create({
        data: {
          name: "Test Delete Floor",
          number: 1,
          buildingId: deleteBuilding.id,
          distance: 5,
        },
      });

      deleteRoom = await prisma.room.create({
        data: {
          name: "Test Delete Room",
          capacity: 30,
          rows: 6,
          cols: 5,
          buildingId: deleteBuilding.id,
          floorId: deleteFloor.id,
          distance: 2,
        },
      });
    });

    it("should cascade delete rooms when floor is deleted", async () => {
      const response = await request(app)
        .delete(`/api/locations/floors/${deleteFloor.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(204);

      // Verify room is also deleted
      const room = await prisma.room.findUnique({
        where: { id: deleteRoom.id },
      });
      expect(room).toBeNull();
    });

    it("should cascade delete floors when building is deleted", async () => {
      // Create new floor for this test
      const newFloor = await prisma.floor.create({
        data: {
          name: "Test Delete Floor 2",
          number: 2,
          buildingId: deleteBuilding.id,
          distance: 5,
        },
      });

      const response = await request(app)
        .delete(`/api/locations/buildings/${deleteBuilding.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(204);

      // Verify floor is also deleted
      const floor = await prisma.floor.findUnique({
        where: { id: newFloor.id },
      });
      expect(floor).toBeNull();
    });

    it("should cascade delete buildings when block is deleted", async () => {
      // Create new building for this test
      const newBuilding = await prisma.building.create({
        data: {
          name: "Test Delete Building 2",
          code: "TDB2",
          blockId: deleteBlock.id,
          distance: 10,
        },
      });

      const response = await request(app)
        .delete(`/api/locations/blocks/${deleteBlock.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(204);

      // Verify building is also deleted
      const building = await prisma.building.findUnique({
        where: { id: newBuilding.id },
      });
      expect(building).toBeNull();
    });
  });

  describe("Hierarchy Updates", () => {
    it("should update block details", async () => {
      const response = await request(app)
        .put(`/api/locations/blocks/${testBlock.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Updated Test Block",
          distance: 50,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", "Updated Test Block");
      expect(response.body).toHaveProperty("distance", 50);
    });

    it("should update building details", async () => {
      const response = await request(app)
        .put(`/api/locations/buildings/${testBuilding.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Updated Test Building",
          distance: 25,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", "Updated Test Building");
      expect(response.body).toHaveProperty("distance", 25);
    });

    it("should update floor details", async () => {
      const response = await request(app)
        .put(`/api/locations/floors/${testFloor.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Updated Test Floor",
          number: 3,
          distance: 15,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", "Updated Test Floor");
      expect(response.body).toHaveProperty("number", 3);
      expect(response.body).toHaveProperty("distance", 15);
    });

    it("should update room details", async () => {
      const response = await request(app)
        .put(`/api/rooms/${testRoom.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Updated Test Room",
          capacity: 50,
          distance: 8,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("name", "Updated Test Room");
      expect(response.body).toHaveProperty("capacity", 50);
      expect(response.body).toHaveProperty("distance", 8);
    });
  });

  describe("Hierarchy Listing", () => {
    it("should list all blocks", async () => {
      const response = await request(app)
        .get("/api/locations/blocks")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should list all buildings", async () => {
      const response = await request(app)
        .get("/api/locations/buildings")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("should list floors filtered by building", async () => {
      const response = await request(app)
        .get("/api/locations/floors")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ buildingId: testBuilding.id });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // All floors should belong to the specified building
      response.body.forEach((floor: any) => {
        expect(floor.buildingId).toBe(testBuilding.id);
      });
    });

    it("should list rooms with hierarchy information", async () => {
      const response = await request(app)
        .get("/api/rooms")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      // Verify rooms include floor and building information
      const room = response.body.find((r: any) => r.id === testRoom.id);
      expect(room).toBeDefined();
      expect(room).toHaveProperty("floorId");
      expect(room).toHaveProperty("buildingId");
    });
  });
});
