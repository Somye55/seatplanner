import { config } from "dotenv";
import { PrismaClient } from "./generated/prisma/client";

// Load environment variables
config();

const prisma = new PrismaClient();

async function checkRoomSeats() {
  try {
    console.log("Checking rooms and their seats...\n");

    const rooms = await prisma.room.findMany({
      include: {
        building: {
          include: {
            block: true,
          },
        },
        floor: true,
        _count: {
          select: {
            seats: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    console.log(`Total rooms: ${rooms.length}\n`);

    for (const room of rooms) {
      const seatCount = room._count.seats;
      const status = seatCount === 0 ? "⚠️  NO SEATS" : "✓ Has seats";

      console.log(`${status} - ${room.name}`);
      console.log(
        `  Location: ${room.building.block.name} > ${room.building.name} > ${room.floor.name}`
      );
      console.log(
        `  Capacity: ${room.capacity}, Rows: ${room.rows}, Cols: ${room.cols}`
      );
      console.log(`  Seats created: ${seatCount}`);
      console.log(
        `  Branch allocated: ${room.branchAllocated || "None"}, Claimed: ${
          room.claimed
        }`
      );
      console.log("");
    }

    // Check for students
    const students = await prisma.student.findMany({
      include: {
        _count: {
          select: {
            seats: true,
          },
        },
      },
    });

    console.log(`\nTotal students: ${students.length}`);

    const studentsByBranch = students.reduce((acc, student) => {
      if (!acc[student.branch]) {
        acc[student.branch] = { total: 0, allocated: 0, unallocated: 0 };
      }
      acc[student.branch].total++;
      if (student._count.seats > 0) {
        acc[student.branch].allocated++;
      } else {
        acc[student.branch].unallocated++;
      }
      return acc;
    }, {} as Record<string, { total: number; allocated: number; unallocated: number }>);

    console.log("\nStudents by branch:");
    for (const [branch, stats] of Object.entries(studentsByBranch)) {
      console.log(
        `  ${branch}: ${stats.total} total (${stats.allocated} allocated, ${stats.unallocated} unallocated)`
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoomSeats();
