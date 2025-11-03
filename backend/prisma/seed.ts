import { PrismaClient } from '../generated/prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

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
    { id: uuidv4(), buildingId: building1Id, name: 'Lecture Hall 101', capacity: 50 },
    { id: uuidv4(), buildingId: building1Id, name: 'Computer Lab 203', capacity: 30 },
    // AHP Rooms
    { id: uuidv4(), buildingId: building2Id, name: 'Studio C', capacity: 25 },
  ];

  console.log('Seeding rooms...');
  await prisma.room.createMany({
    data: roomData,
    skipDuplicates: true,
  });

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
