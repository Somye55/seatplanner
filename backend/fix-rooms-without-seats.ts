import { config } from "dotenv";
import { PrismaClient } from "./generated/prisma/client";
import { SeatGenerationService } from "./src/services/seatGenerationService";

// Load environment variables
config();

const prisma = new PrismaClient();

async function fixRoomsWithoutSeats() {
  try {
    console.log("Finding rooms without seats...\n");

    const rooms = await prisma.room.findMany({
      include: {
        _count: {
          select: {
            seats: true,
          },
        },
      },
    });

    const roomsWithoutSeats = rooms.filter((room) => room._count.seats === 0);

    if (roomsWithoutSeats.length === 0) {
      console.log("✓ All rooms have seats!");
      return;
    }

    console.log(`Found ${roomsWithoutSeats.length} rooms without seats:\n`);

    for (const room of roomsWithoutSeats) {
      console.log(`Generating seats for: ${room.name}`);
      console.log(
        `  Capacity: ${room.capacity}, Rows: ${room.rows}, Cols: ${room.cols}`
      );

      await SeatGenerationService.generateSeatsForRoom(
        room.id,
        room.capacity,
        room.rows,
        room.cols,
        prisma
      );

      // Verify seats were created
      const seatCount = await prisma.seat.count({
        where: { roomId: room.id },
      });

      console.log(`  ✓ Created ${seatCount} seats\n`);
    }

    console.log("✓ All rooms now have seats!");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRoomsWithoutSeats();
