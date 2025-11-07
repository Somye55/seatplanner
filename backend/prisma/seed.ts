import { PrismaClient } from "../generated/prisma/client";
import { v4 as uuidv4 } from "uuid";
import { SeatGenerationService } from "../src/services/seatGenerationService";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Clear existing data in correct order
  await prisma.seat.deleteMany({});
  await prisma.roomBooking.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.floor.deleteMany({});
  await prisma.building.deleteMany({});
  await prisma.block.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.teacher.deleteMany({});

  // Create Blocks
  console.log("Seeding blocks...");
  const block1Id = uuidv4();
  const block2Id = uuidv4();
  const block3Id = uuidv4();

  await prisma.block.createMany({
    data: [
      { id: block1Id, name: "North Campus Block", code: "NCB", distance: 0 },
      { id: block2Id, name: "South Campus Block", code: "SCB", distance: 500 },
      { id: block3Id, name: "East Campus Block", code: "ECB", distance: 300 },
    ],
  });

  // Create Buildings
  console.log("Seeding buildings...");
  const building1Id = uuidv4();
  const building2Id = uuidv4();
  const building3Id = uuidv4();
  const building4Id = uuidv4();

  await prisma.building.createMany({
    data: [
      {
        id: building1Id,
        name: "Science & Engineering Hall",
        code: "SEH",
        blockId: block1Id,
        distance: 0,
      },
      {
        id: building2Id,
        name: "Arts & Humanities Pavilion",
        code: "AHP",
        blockId: block1Id,
        distance: 100,
      },
      {
        id: building3Id,
        name: "Business School Tower",
        code: "BST",
        blockId: block2Id,
        distance: 500,
      },
      {
        id: building4Id,
        name: "Medical Sciences Building",
        code: "MSB",
        blockId: block3Id,
        distance: 300,
      },
    ],
  });

  // Create Floors
  console.log("Seeding floors...");
  const floors: Array<{
    id: string;
    buildingId: string;
    name: string;
    number: number;
    distance: number;
  }> = [];

  // SEH - 3 floors
  for (let i = 1; i <= 3; i++) {
    floors.push({
      id: uuidv4(),
      buildingId: building1Id,
      name: `Floor ${i}`,
      number: i,
      distance: i * 10,
    });
  }

  // AHP - 2 floors
  for (let i = 1; i <= 2; i++) {
    floors.push({
      id: uuidv4(),
      buildingId: building2Id,
      name: `Floor ${i}`,
      number: i,
      distance: i * 10,
    });
  }

  // BST - 4 floors
  for (let i = 1; i <= 4; i++) {
    floors.push({
      id: uuidv4(),
      buildingId: building3Id,
      name: `Floor ${i}`,
      number: i,
      distance: i * 10,
    });
  }

  // MSB - 3 floors
  for (let i = 1; i <= 3; i++) {
    floors.push({
      id: uuidv4(),
      buildingId: building4Id,
      name: `Floor ${i}`,
      number: i,
      distance: i * 10,
    });
  }

  await prisma.floor.createMany({ data: floors });

  // Create Rooms
  console.log("Seeding rooms...");
  const roomData = [
    // SEH Rooms (Floor 1)
    {
      id: uuidv4(),
      buildingId: building1Id,
      floorId: floors[0].id,
      name: "Lecture Hall 101",
      capacity: 50,
      rows: 10,
      cols: 5,
      distance: 0,
    },
    {
      id: uuidv4(),
      buildingId: building1Id,
      floorId: floors[0].id,
      name: "Lab 102",
      capacity: 30,
      rows: 6,
      cols: 5,
      distance: 20,
    },
    // SEH Rooms (Floor 2)
    {
      id: uuidv4(),
      buildingId: building1Id,
      floorId: floors[1].id,
      name: "Computer Lab 203",
      capacity: 40,
      rows: 8,
      cols: 5,
      distance: 10,
    },
    {
      id: uuidv4(),
      buildingId: building1Id,
      floorId: floors[1].id,
      name: "Seminar Room 204",
      capacity: 25,
      rows: 5,
      cols: 5,
      distance: 15,
    },
    // AHP Rooms (Floor 1)
    {
      id: uuidv4(),
      buildingId: building2Id,
      floorId: floors[3].id,
      name: "Studio A",
      capacity: 30,
      rows: 6,
      cols: 5,
      distance: 0,
    },
    {
      id: uuidv4(),
      buildingId: building2Id,
      floorId: floors[3].id,
      name: "Studio B",
      capacity: 25,
      rows: 5,
      cols: 5,
      distance: 10,
    },
    // BST Rooms (Floor 1)
    {
      id: uuidv4(),
      buildingId: building3Id,
      floorId: floors[5].id,
      name: "Conference Room 101",
      capacity: 35,
      rows: 7,
      cols: 5,
      distance: 0,
    },
    {
      id: uuidv4(),
      buildingId: building3Id,
      floorId: floors[5].id,
      name: "Classroom 102",
      capacity: 45,
      rows: 9,
      cols: 5,
      distance: 15,
    },
    // BST Rooms (Floor 2)
    {
      id: uuidv4(),
      buildingId: building3Id,
      floorId: floors[6].id,
      name: "Executive Room 201",
      capacity: 20,
      rows: 4,
      cols: 5,
      distance: 10,
    },
    // MSB Rooms (Floor 1)
    {
      id: uuidv4(),
      buildingId: building4Id,
      floorId: floors[9].id,
      name: "Anatomy Lab 101",
      capacity: 40,
      rows: 8,
      cols: 5,
      distance: 0,
    },
    {
      id: uuidv4(),
      buildingId: building4Id,
      floorId: floors[9].id,
      name: "Research Lab 102",
      capacity: 30,
      rows: 6,
      cols: 5,
      distance: 20,
    },
  ];

  for (const room of roomData) {
    await prisma.room.create({
      data: room,
    });
    console.log(`Generating seats for ${room.name}...`);
    await SeatGenerationService.generateSeatsForRoom(
      room.id,
      room.capacity,
      room.rows,
      room.cols,
      prisma
    );
  }

  // Create Admin Users
  console.log("Seeding admin users...");
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.createMany({
    data: [
      {
        id: uuidv4(),
        email: "admin@university.edu",
        password: hashedPassword,
        role: "Admin",
      },
      {
        id: uuidv4(),
        email: "admin2@university.edu",
        password: hashedPassword,
        role: "Admin",
      },
    ],
  });

  // Create Teachers
  console.log("Seeding teachers...");
  const teacherPassword = await bcrypt.hash("teacher123", 10);

  const teachers = [
    {
      id: uuidv4(),
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@university.edu",
    },
    {
      id: uuidv4(),
      name: "Prof. Michael Chen",
      email: "michael.chen@university.edu",
    },
    {
      id: uuidv4(),
      name: "Dr. Emily Rodriguez",
      email: "emily.rodriguez@university.edu",
    },
    {
      id: uuidv4(),
      name: "Prof. David Kim",
      email: "david.kim@university.edu",
    },
    {
      id: uuidv4(),
      name: "Dr. Lisa Anderson",
      email: "lisa.anderson@university.edu",
    },
  ];

  for (const teacher of teachers) {
    const userId = uuidv4();

    const createdTeacher = await prisma.teacher.create({
      data: {
        ...teacher,
        password: "teacher123",
        userId: userId,
      },
    });

    await prisma.user.create({
      data: {
        id: userId,
        email: teacher.email,
        password: teacherPassword,
        role: "Teacher",
        teacherId: createdTeacher.id,
      },
    });
  }

  // Create Students
  console.log("Seeding students...");
  const studentPassword = await bcrypt.hash("student123", 10);

  const branches = [
    "ConsultingClub",
    "InvestmentBankingClub",
    "TechAndInnovationClub",
    "EntrepreneurshipCell",
    "SustainabilityAndCSRClub",
    "WomenInBusiness",
    "HealthcareManagementClub",
    "RealEstateClub",
  ];

  const students = [
    {
      name: "Alice Williams",
      email: "alice.williams@student.edu",
      branch: "ConsultingClub",
      tags: ["leadership", "analytics"],
      accessibilityNeeds: [],
    },
    {
      name: "Bob Martinez",
      email: "bob.martinez@student.edu",
      branch: "InvestmentBankingClub",
      tags: ["finance", "quantitative"],
      accessibilityNeeds: [],
    },
    {
      name: "Carol Davis",
      email: "carol.davis@student.edu",
      branch: "TechAndInnovationClub",
      tags: ["coding", "innovation"],
      accessibilityNeeds: ["wheelchair"],
    },
    {
      name: "Daniel Brown",
      email: "daniel.brown@student.edu",
      branch: "EntrepreneurshipCell",
      tags: ["startup", "creative"],
      accessibilityNeeds: [],
    },
    {
      name: "Emma Wilson",
      email: "emma.wilson@student.edu",
      branch: "SustainabilityAndCSRClub",
      tags: ["environment", "social-impact"],
      accessibilityNeeds: [],
    },
    {
      name: "Frank Taylor",
      email: "frank.taylor@student.edu",
      branch: "WomenInBusiness",
      tags: ["diversity", "leadership"],
      accessibilityNeeds: [],
    },
    {
      name: "Grace Lee",
      email: "grace.lee@student.edu",
      branch: "HealthcareManagementClub",
      tags: ["healthcare", "management"],
      accessibilityNeeds: ["hearing-impaired"],
    },
    {
      name: "Henry Garcia",
      email: "henry.garcia@student.edu",
      branch: "RealEstateClub",
      tags: ["property", "investment"],
      accessibilityNeeds: [],
    },
    {
      name: "Iris Thompson",
      email: "iris.thompson@student.edu",
      branch: "ConsultingClub",
      tags: ["strategy", "problem-solving"],
      accessibilityNeeds: [],
    },
    {
      name: "Jack Robinson",
      email: "jack.robinson@student.edu",
      branch: "TechAndInnovationClub",
      tags: ["ai", "machine-learning"],
      accessibilityNeeds: [],
    },
    {
      name: "Kate Anderson",
      email: "kate.anderson@student.edu",
      branch: "InvestmentBankingClub",
      tags: ["markets", "trading"],
      accessibilityNeeds: [],
    },
    {
      name: "Liam White",
      email: "liam.white@student.edu",
      branch: "EntrepreneurshipCell",
      tags: ["business-model", "pitch"],
      accessibilityNeeds: [],
    },
    {
      name: "Mia Harris",
      email: "mia.harris@student.edu",
      branch: "SustainabilityAndCSRClub",
      tags: ["renewable-energy", "policy"],
      accessibilityNeeds: [],
    },
    {
      name: "Noah Clark",
      email: "noah.clark@student.edu",
      branch: "HealthcareManagementClub",
      tags: ["hospital-admin", "operations"],
      accessibilityNeeds: [],
    },
    {
      name: "Olivia Lewis",
      email: "olivia.lewis@student.edu",
      branch: "RealEstateClub",
      tags: ["commercial", "residential"],
      accessibilityNeeds: [],
    },
  ];

  for (const student of students) {
    const userId = uuidv4();

    const createdStudent = await prisma.student.create({
      data: {
        id: uuidv4(),
        name: student.name,
        email: student.email,
        branch: student.branch as any,
        tags: student.tags,
        accessibilityNeeds: student.accessibilityNeeds,
        userId: userId,
      },
    });

    await prisma.user.create({
      data: {
        id: userId,
        email: student.email,
        password: studentPassword,
        role: "Student",
        studentId: createdStudent.id,
      },
    });
  }

  console.log(`Seeding finished.`);
  console.log(`Created:`);
  console.log(`- 3 blocks`);
  console.log(`- 4 buildings`);
  console.log(`- 12 floors`);
  console.log(`- 11 rooms with seats`);
  console.log(`- 2 admin users`);
  console.log(`- 5 teachers`);
  console.log(`- 15 students`);
  console.log(`\nDefault passwords:`);
  console.log(`- Admin: admin123`);
  console.log(`- Teacher: teacher123`);
  console.log(`- Student: student123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
