import { PrismaClient } from "./generated/prisma";

/**
 * Data migration script to add default Block and Floor for existing Buildings and Rooms
 * This script should be run AFTER the Prisma migration that adds the new models
 * but BEFORE making blockId and floorId required fields
 */
async function migrateToLocationHierarchy() {
  const prisma = new PrismaClient();

  try {
    console.log("Starting location hierarchy migration...");

    // 1. Create default block
    console.log("Creating default block...");
    const defaultBlock = await prisma.block.create({
      data: {
        name: "Main Campus",
        code: "MAIN",
        distance: 0,
      },
    });
    console.log(
      `Created default block: ${defaultBlock.name} (${defaultBlock.id})`
    );

    // 2. Update all buildings to belong to default block
    console.log("Updating buildings to belong to default block...");
    const buildings = await prisma.building.findMany();

    for (const building of buildings) {
      await prisma.building.update({
        where: { id: building.id },
        data: {
          blockId: defaultBlock.id,
          distance: 0,
        },
      });
      console.log(`Updated building: ${building.name}`);
    }

    // 3. For each building, create a default floor
    console.log("Creating default floors for each building...");
    for (const building of buildings) {
      const defaultFloor = await prisma.floor.create({
        data: {
          name: "Ground Floor",
          number: 0,
          buildingId: building.id,
          distance: 0,
        },
      });
      console.log(
        `Created default floor for building ${building.name}: ${defaultFloor.name} (${defaultFloor.id})`
      );

      // 4. Update all rooms in this building to belong to default floor
      const rooms = await prisma.room.findMany({
        where: { buildingId: building.id },
      });

      for (const room of rooms) {
        await prisma.room.update({
          where: { id: room.id },
          data: {
            floorId: defaultFloor.id,
            distance: 0,
          },
        });
        console.log(`  Updated room: ${room.name}`);
      }
    }

    console.log("Migration completed successfully!");
    console.log(`Summary:
  - Created 1 default block
  - Updated ${buildings.length} buildings
  - Created ${buildings.length} default floors
  - Updated rooms in all buildings`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateToLocationHierarchy()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
