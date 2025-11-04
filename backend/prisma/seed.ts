import { PrismaClient } from '../generated/prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { SeatGenerationService } from '../src/services/seatGenerationService';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Clear existing data
  await prisma.seat.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.building.deleteMany({});

  const building1Id = uuidv4();
  const building2Id = uuidv4();
  
  console.log('Seeding buildings...');
  await prisma.building.createMany({
    data: [
      { id: building1Id, name: 'Science & Engineering Hall', code: 'SEH' },
      { id: building2Id, name: 'Arts & Humanities Pavilion', code: 'AHP' },
    ],
    skipDuplicates: true,
  });

  const roomData = [
    // SEH Rooms
    { id: uuidv4(), buildingId: building1Id, name: 'Lecture Hall 101', capacity: 50, rows: 10, cols: 5 },
    { id: uuidv4(), buildingId: building1Id, name: 'Computer Lab 203', capacity: 30, rows: 6, cols: 5 },
    // AHP Rooms
    { id: uuidv4(), buildingId: building2Id, name: 'Studio C', capacity: 25, rows: 5, cols: 5 },
  ];

  console.log('Seeding rooms...');
  for (const room of roomData) {
    await prisma.room.create({
      data: room,
    });
    console.log(`Generating seats for ${room.name}...`);
    await SeatGenerationService.generateSeatsForRoom(room.id, room.capacity, room.rows, room.cols, prisma);
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
