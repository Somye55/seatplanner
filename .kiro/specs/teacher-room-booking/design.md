# Design Document

## Overview

This design document outlines the technical architecture for implementing a teacher room booking system with hierarchical location management. The system extends the existing seat allocation platform to support teacher-initiated room bookings based on capacity, timing, and location preferences. Key features include:

- Teacher role with restricted signup
- Four-level location hierarchy (Block → Building → Floor → Room)
- Distance-based room recommendation algorithm
- Time-bound room allocations with automatic expiration
- Admin-managed user creation (teachers and students)
- Faculty management interface

The design leverages the existing Prisma/PostgreSQL backend, Express.js API, and React/HeroUI frontend while introducing new models, services, and UI components.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
├─────────────────────────────────────────────────────────────┤
│  - TeacherDashboard (Room Search & Booking)                 │
│  - FacultyManagementPage (Admin)                            │
│  - LocationManagementPages (Admin: Blocks/Buildings/Floors) │
│  - Updated Layout (Teacher Navigation)                       │
│  - Updated Auth (Remove Signup)                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Express)                      │
├─────────────────────────────────────────────────────────────┤
│  - /api/teachers (CRUD, Admin only)                         │
│  - /api/room-bookings (Search, Create, List, Auto-expire)   │
│  - /api/locations (Blocks, Buildings, Floors - Admin)       │
│  - /api/auth (Updated: Remove signup, Add Teacher role)     │
│  - /api/students (Updated: Restrict name editing)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
├─────────────────────────────────────────────────────────────┤
│  - RoomRecommendationService (Distance calculation)         │
│  - BookingExpirationService (Scheduled cleanup)             │
│  - LocationDistanceService (Hierarchy distance calc)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer (Prisma/PostgreSQL)              │
├─────────────────────────────────────────────────────────────┤
│  Models: Teacher, Block, Building (updated), Floor,         │
│          Room (updated), RoomBooking                         │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React, TypeScript, HeroUI components
- **Authentication**: JWT tokens (existing)
- **Real-time**: Socket.io (existing, for booking updates)

## Data Models

### Updated Prisma Schema

#### New Models

```prisma
model Teacher {
  id        String        @id @default(cuid())
  name      String
  email     String        @unique
  userId    String?       @unique
  user      User?         @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookings  RoomBooking[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
}

model Block {
  id        String     @id @default(cuid())
  name      String
  code      String     @unique
  distance  Float      @default(0) // Distance parameter for proximity calculations
  buildings Building[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}

model Floor {
  id         String   @id @default(cuid())
  buildingId String
  building   Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  name       String
  number     Int
  distance   Float    @default(0) // Distance parameter within building
  rooms      Room[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model RoomBooking {
  id        String   @id @default(cuid())
  roomId    String
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  teacherId String
  teacher   Teacher  @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  branch    Branch
  capacity  Int      // Number of students for this booking
  startTime DateTime
  endTime   DateTime
  status    BookingStatus @default(NotStarted)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([roomId, startTime, endTime])
  @@index([teacherId])
  @@index([status])
}

enum BookingStatus {
  NotStarted
  Ongoing
  Completed
}
```

#### Updated Models

```prisma
// Update User model to include Teacher role
enum UserRole {
  Admin
  Student
  Teacher  // NEW
}

// Update Building model to include Block relationship and distance
model Building {
  id        String   @id @default(cuid())
  name      String
  code      String   @unique
  blockId   String   // NEW
  block     Block    @relation(fields: [blockId], references: [id], onDelete: Cascade) // NEW
  distance  Float    @default(0) // NEW - Distance parameter within block
  floors    Floor[]  // NEW
  rooms     Room[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Update Room model to include Floor relationship and distance
model Room {
  id              String        @id @default(cuid())
  buildingId      String
  building        Building      @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  floorId         String        // NEW
  floor           Floor         @relation(fields: [floorId], references: [id], onDelete: Cascade) // NEW
  name            String
  capacity        Int
  rows            Int
  cols            Int
  claimed         Int           @default(0)
  distance        Float         @default(0) // NEW - Distance parameter within floor
  version         Int           @default(1)
  seats           Seat[]
  bookings        RoomBooking[] // NEW
  branchAllocated Branch?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}
```

### Data Model Relationships

```
Block (1) ──< (N) Building
Building (1) ──< (N) Floor
Floor (1) ──< (N) Room
Room (1) ──< (N) RoomBooking
Teacher (1) ──< (N) RoomBooking
User (1) ──── (1) Teacher
```

## Components and Interfaces

### Backend API Endpoints

#### Teacher Management (Admin Only)

```typescript
// POST /api/teachers - Create teacher profile
// Body: { name, email, password }
// Response: Teacher

// GET /api/teachers - List all teachers
// Response: Teacher[]

// GET /api/teachers/:id - Get teacher details
// Response: Teacher

// PUT /api/teachers/:id - Update teacher (email, password only)
// Body: { email?, password? }
// Response: Teacher

// DELETE /api/teachers/:id - Delete teacher
// Response: 204
```

#### Room Booking

```typescript
// POST /api/room-bookings/search - Find suitable rooms
// Body: { capacity, branch, startTime, endTime, preferredLocation?: { blockId?, buildingId?, floorId? } }
// Response: { rooms: RoomRecommendation[] }
// RoomRecommendation: { room: Room, distance: number, score: number }

// POST /api/room-bookings - Create booking (claim room)
// Body: { roomId, branch, capacity, startTime, endTime }
// Response: RoomBooking

// GET /api/room-bookings - List bookings (filtered by teacherId or roomId)
// Query: { teacherId?, roomId?, status? }
// Response: RoomBooking[]

// DELETE /api/room-bookings/:id - Cancel booking
// Response: 204
```

#### Location Management (Admin Only)

```typescript
// Blocks
// POST /api/locations/blocks - Create block
// GET /api/locations/blocks - List blocks
// PUT /api/locations/blocks/:id - Update block
// DELETE /api/locations/blocks/:id - Delete block

// Buildings (Updated)
// POST /api/locations/buildings - Create building (requires blockId)
// GET /api/locations/buildings - List buildings
// PUT /api/locations/buildings/:id - Update building
// DELETE /api/locations/buildings/:id - Delete building

// Floors
// POST /api/locations/floors - Create floor
// GET /api/locations/floors - List floors (filtered by buildingId)
// PUT /api/locations/floors/:id - Update floor
// DELETE /api/locations/floors/:id - Delete floor

// Rooms (Updated)
// POST /api/rooms - Create room (requires floorId)
// Existing endpoints remain with added floor support
```

#### Updated Auth Endpoints

```typescript
// POST /api/auth/login - Login (supports Teacher role)
// Body: { email, password }
// Response: { user: User, token: string }

// POST /api/auth/signup - REMOVED (return 404 or 403)
```

#### Updated Student Endpoints

```typescript
// PUT /api/students/:id - Update student (name field read-only)
// Body: { email?, password?, branch?, tags?, accessibilityNeeds? }
// Note: Name changes rejected with 400 error
```

### Frontend Components

#### New Pages

```typescript
// TeacherDashboardPage
// - Room search form (capacity, branch, timing, location preferences)
// - Search results with room recommendations
// - Booking confirmation
// - My bookings list with status

// FacultyManagementPage (Admin)
// - Teacher list table
// - Add/Edit teacher modal
// - Delete confirmation
// - Similar to StudentsPage

// BlocksPage (Admin)
// - Block list with distance parameters
// - CRUD operations

// FloorsPage (Admin)
// - Floor list filtered by building
// - CRUD operations with distance parameters
```

#### Updated Pages

```typescript
// BuildingsPage
// - Add block selection dropdown
// - Add distance parameter field
// - Update building creation/editing

// RoomsPage
// - Add floor selection dropdown
// - Add distance parameter field
// - Show booking status alongside allocation status

// Layout
// - Add "Faculty" navigation item for admins
// - Add "Find Room" navigation item for teachers
// - Remove signup links

// SignInPage
// - Support Teacher role in login
// - Remove "Sign Up" link
```

#### New Components

```typescript
// RoomSearchForm
interface RoomSearchFormProps {
  onSearch: (criteria: SearchCriteria) => void;
  loading: boolean;
}

// RoomRecommendationCard
interface RoomRecommendationCardProps {
  room: Room;
  distance: number;
  score: number;
  onClaim: (roomId: string) => void;
}

// BookingStatusBadge
interface BookingStatusBadgeProps {
  status: "NotStarted" | "Ongoing" | "Completed";
  startTime: Date;
  endTime: Date;
}

// LocationHierarchySelector
interface LocationHierarchySelectorProps {
  onSelect: (location: { blockId?; buildingId?; floorId? }) => void;
  level: "block" | "building" | "floor";
}
```

## Business Logic

### Room Recommendation Algorithm

The system recommends rooms based on a scoring algorithm that considers capacity match, availability, and location proximity.

```typescript
interface SearchCriteria {
  capacity: number;
  branch: Branch;
  startTime: Date;
  endTime: Date;
  preferredLocation?: {
    blockId?: string;
    buildingId?: string;
    floorId?: string;
  };
}

interface RoomRecommendation {
  room: Room & { building: Building & { block: Block }; floor: Floor };
  distance: number;
  score: number;
}

// Scoring Algorithm
function calculateRoomScore(room: Room, criteria: SearchCriteria): number {
  let score = 0;

  // 1. Capacity Score (40 points max)
  if (room.capacity === criteria.capacity) {
    score += 40; // Perfect match
  } else if (room.capacity >= criteria.capacity) {
    // Penalize excess capacity: score decreases as excess increases
    const excess = room.capacity - criteria.capacity;
    score += Math.max(0, 40 - excess * 2);
  }

  // 2. Availability Score (30 points)
  // Room is available if no overlapping bookings exist
  const isAvailable = !hasOverlappingBooking(
    room,
    criteria.startTime,
    criteria.endTime
  );
  if (isAvailable) {
    score += 30;
  }

  // 3. Location Proximity Score (30 points max)
  if (criteria.preferredLocation) {
    const distance = calculateDistance(room, criteria.preferredLocation);
    // Closer = higher score (inverse relationship)
    score += Math.max(0, 30 - distance);
  }

  return score;
}
```

### Distance Calculation

Distance is calculated hierarchically based on the location parameters at each level.

```typescript
function calculateDistance(
  room: Room & { building: Building & { block: Block }; floor: Floor },
  preferred: { blockId?: string; buildingId?: string; floorId?: string }
): number {
  let totalDistance = 0;

  // Block-level distance
  if (preferred.blockId && room.building.blockId !== preferred.blockId) {
    totalDistance += room.building.block.distance;
  }

  // Building-level distance
  if (preferred.buildingId && room.buildingId !== preferred.buildingId) {
    totalDistance += room.building.distance;
  }

  // Floor-level distance
  if (preferred.floorId && room.floorId !== preferred.floorId) {
    totalDistance += room.floor.distance;
  }

  // Room-level distance (within same floor)
  if (preferred.floorId === room.floorId) {
    totalDistance += room.distance;
  }

  return totalDistance;
}
```

### Booking Overlap Detection

```typescript
function hasOverlappingBooking(
  room: Room,
  startTime: Date,
  endTime: Date
): boolean {
  // Query database for bookings where:
  // (booking.startTime < endTime) AND (booking.endTime > startTime)
  // AND booking.status IN ('NotStarted', 'Ongoing')

  return (
    prisma.roomBooking.count({
      where: {
        roomId: room.id,
        status: { in: ["NotStarted", "Ongoing"] },
        OR: [
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gt: startTime } },
            ],
          },
        ],
      },
    }) > 0
  );
}
```

### Automatic Booking Expiration

A scheduled service runs periodically to update booking statuses and free expired rooms.

```typescript
class BookingExpirationService {
  // Run every 5 minutes
  async updateBookingStatuses() {
    const now = new Date();

    // Update NotStarted → Ongoing
    await prisma.roomBooking.updateMany({
      where: {
        status: "NotStarted",
        startTime: { lte: now },
        endTime: { gt: now },
      },
      data: { status: "Ongoing" },
    });

    // Update Ongoing → Completed and free room
    const expiredBookings = await prisma.roomBooking.findMany({
      where: {
        status: { in: ["NotStarted", "Ongoing"] },
        endTime: { lte: now },
      },
    });

    for (const booking of expiredBookings) {
      await prisma.roomBooking.update({
        where: { id: booking.id },
        data: { status: "Completed" },
      });

      // Emit real-time update
      io.emit("bookingExpired", {
        bookingId: booking.id,
        roomId: booking.roomId,
      });
    }
  }
}

// Initialize in server.ts
const expirationService = new BookingExpirationService();
setInterval(() => expirationService.updateBookingStatuses(), 5 * 60 * 1000);
```

## Error Handling

### Backend Error Scenarios

```typescript
// Room Booking Errors
{
  ROOM_NOT_AVAILABLE: {
    status: 409,
    message: 'Room is not available for the selected time period'
  },
  INVALID_TIME_RANGE: {
    status: 400,
    message: 'End time must be after start time'
  },
  PAST_BOOKING: {
    status: 400,
    message: 'Cannot book rooms in the past'
  },
  INSUFFICIENT_CAPACITY: {
    status: 400,
    message: 'Room capacity is less than requested number of students'
  },
  BOOKING_NOT_FOUND: {
    status: 404,
    message: 'Booking not found'
  },
  CANNOT_CANCEL_ONGOING: {
    status: 400,
    message: 'Cannot cancel an ongoing booking'
  }
}

// Teacher Management Errors
{
  TEACHER_EXISTS: {
    status: 400,
    message: 'Teacher with this email already exists'
  },
  TEACHER_NOT_FOUND: {
    status: 404,
    message: 'Teacher not found'
  },
  CANNOT_CREATE_ADMIN: {
    status: 403,
    message: 'Cannot create admin profiles through this interface'
  }
}

// Location Hierarchy Errors
{
  INVALID_PARENT: {
    status: 400,
    message: 'Invalid parent location in hierarchy'
  },
  LOCATION_HAS_CHILDREN: {
    status: 400,
    message: 'Cannot delete location with existing child locations'
  },
  DUPLICATE_LOCATION_CODE: {
    status: 400,
    message: 'Location code already exists'
  }
}

// Auth Errors
{
  SIGNUP_DISABLED: {
    status: 403,
    message: 'Public signup is disabled. Contact an administrator.'
  },
  INVALID_ROLE: {
    status: 400,
    message: 'Invalid user role'
  }
}

// Student Update Errors
{
  NAME_UPDATE_FORBIDDEN: {
    status: 400,
    message: 'Student name cannot be modified'
  }
}
```

### Frontend Error Handling

```typescript
// Use toast notifications for user feedback
import { toast } from "react-hot-toast";

// Success messages
toast.success("Room booked successfully");
toast.success("Teacher profile created");

// Error messages
toast.error("Failed to book room: Room not available");
toast.error("Cannot modify student name");

// Validation errors displayed inline in forms
<Input
  label="Capacity"
  type="number"
  isInvalid={!!errors.capacity}
  errorMessage={errors.capacity}
/>;
```

### Validation Rules

```typescript
// Room Booking Validation
{
  capacity: {
    required: true,
    min: 1,
    max: 1000,
    message: 'Capacity must be between 1 and 1000'
  },
  startTime: {
    required: true,
    validate: (value) => new Date(value) > new Date(),
    message: 'Start time must be in the future'
  },
  endTime: {
    required: true,
    validate: (value, formData) => new Date(value) > new Date(formData.startTime),
    message: 'End time must be after start time'
  }
}

// Teacher Creation Validation
{
  name: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email format'
  },
  password: {
    required: true,
    minLength: 6,
    message: 'Password must be at least 6 characters'
  }
}

// Location Validation
{
  name: {
    required: true,
    minLength: 1,
    maxLength: 100
  },
  code: {
    required: true,
    pattern: /^[A-Z0-9-]+$/,
    message: 'Code must contain only uppercase letters, numbers, and hyphens'
  },
  distance: {
    required: true,
    min: 0,
    message: 'Distance must be a positive number'
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// Backend Services
describe("RoomRecommendationService", () => {
  test("should prioritize exact capacity match", () => {
    // Test capacity scoring logic
  });

  test("should calculate distance correctly across hierarchy", () => {
    // Test distance calculation
  });

  test("should filter out unavailable rooms", () => {
    // Test availability checking
  });
});

describe("BookingExpirationService", () => {
  test("should update NotStarted to Ongoing when start time passes", () => {
    // Test status transition
  });

  test("should mark bookings as Completed when end time passes", () => {
    // Test expiration logic
  });
});

// Frontend Components
describe("RoomSearchForm", () => {
  test("should validate required fields", () => {
    // Test form validation
  });

  test("should prevent past date selection", () => {
    // Test date validation
  });
});

describe("BookingStatusBadge", () => {
  test("should display correct status based on time", () => {
    // Test status display logic
  });
});
```

### Integration Tests

```typescript
// API Endpoint Tests
describe("POST /api/room-bookings/search", () => {
  test("should return rooms sorted by score", async () => {
    // Create test data with various rooms
    // Search with criteria
    // Verify results are sorted correctly
  });

  test("should return empty array when no rooms available", async () => {
    // Test with all rooms booked
  });
});

describe("POST /api/room-bookings", () => {
  test("should create booking and prevent overlapping bookings", async () => {
    // Create first booking
    // Attempt overlapping booking
    // Verify second booking fails
  });

  test("should reject booking for insufficient capacity", async () => {
    // Test capacity validation
  });
});

describe("POST /api/teachers", () => {
  test("should create teacher profile with user account", async () => {
    // Test teacher creation
    // Verify user account created
  });

  test("should prevent duplicate email", async () => {
    // Test duplicate prevention
  });
});
```

### End-to-End Tests

```typescript
// Teacher Booking Flow
describe("Teacher Room Booking Flow", () => {
  test("teacher can search and book a room", async () => {
    // 1. Login as teacher
    // 2. Navigate to room search
    // 3. Fill search criteria
    // 4. Select recommended room
    // 5. Confirm booking
    // 6. Verify booking appears in "My Bookings"
  });

  test("booking status updates automatically", async () => {
    // 1. Create booking with near-future start time
    // 2. Wait for start time to pass
    // 3. Verify status changes to "Ongoing"
    // 4. Wait for end time to pass
    // 5. Verify booking is removed/completed
  });
});

// Admin Faculty Management Flow
describe("Admin Faculty Management", () => {
  test("admin can create and manage teacher profiles", async () => {
    // 1. Login as admin
    // 2. Navigate to Faculty page
    // 3. Create new teacher
    // 4. Edit teacher email
    // 5. Verify changes
    // 6. Delete teacher
  });
});

// Location Hierarchy Management
describe("Location Hierarchy Management", () => {
  test("admin can create complete location hierarchy", async () => {
    // 1. Create block
    // 2. Create building in block
    // 3. Create floor in building
    // 4. Create room in floor
    // 5. Verify hierarchy relationships
  });
});
```

### Test Data Setup

```typescript
// Seed data for testing
const testData = {
  blocks: [
    { name: "North Block", code: "NB", distance: 0 },
    { name: "South Block", code: "SB", distance: 500 },
  ],
  buildings: [
    { name: "Building A", code: "BA", blockId: "NB", distance: 0 },
    { name: "Building B", code: "BB", blockId: "NB", distance: 100 },
  ],
  floors: [
    { name: "Ground Floor", number: 0, buildingId: "BA", distance: 0 },
    { name: "First Floor", number: 1, buildingId: "BA", distance: 10 },
  ],
  rooms: [
    { name: "Room 101", capacity: 30, floorId: "GF", distance: 0 },
    { name: "Room 102", capacity: 50, floorId: "GF", distance: 5 },
  ],
  teachers: [
    { name: "John Doe", email: "john@example.com", password: "password123" },
  ],
};
```

### Performance Testing

```typescript
// Load Testing Scenarios
describe("Performance Tests", () => {
  test("room search should complete within 500ms for 1000 rooms", async () => {
    // Create 1000 rooms
    // Measure search performance
  });

  test("booking expiration service should handle 10000 bookings", async () => {
    // Create 10000 expired bookings
    // Measure cleanup performance
  });

  test("distance calculation should be efficient for deep hierarchies", async () => {
    // Create deep location hierarchy
    // Measure calculation time
  });
});
```

## Database Migration Strategy

### Migration Steps

The database schema changes require careful migration to avoid data loss and maintain system integrity.

```typescript
// Migration 1: Add Teacher model and update UserRole enum
// - Add Teacher table
// - Add Teacher role to UserRole enum
// - Create indexes on Teacher.email and Teacher.userId

// Migration 2: Add location hierarchy
// - Add Block table
// - Add Floor table
// - Add distance columns to Block, Building, Floor, Room
// - Add blockId to Building (nullable initially)
// - Add floorId to Room (nullable initially)

// Migration 3: Create default hierarchy for existing data
// - Create default Block for existing Buildings
// - Create default Floors for existing Rooms
// - Update Building.blockId references
// - Update Room.floorId references
// - Make blockId and floorId non-nullable

// Migration 4: Add RoomBooking model
// - Add RoomBooking table
// - Add BookingStatus enum
// - Create indexes on roomId, teacherId, status, and time ranges

// Migration 5: Remove signup functionality
// - No database changes, only API/frontend updates
```

### Data Migration Script

```typescript
// scripts/migrate-location-hierarchy.ts
async function migrateToLocationHierarchy() {
  const prisma = new PrismaClient();

  try {
    // 1. Create default block
    const defaultBlock = await prisma.block.create({
      data: {
        name: "Main Campus",
        code: "MAIN",
        distance: 0,
      },
    });

    // 2. Update all buildings to belong to default block
    await prisma.building.updateMany({
      data: {
        blockId: defaultBlock.id,
        distance: 0,
      },
    });

    // 3. For each building, create a default floor
    const buildings = await prisma.building.findMany();

    for (const building of buildings) {
      const defaultFloor = await prisma.floor.create({
        data: {
          name: "Ground Floor",
          number: 0,
          buildingId: building.id,
          distance: 0,
        },
      });

      // 4. Update all rooms in this building to belong to default floor
      await prisma.room.updateMany({
        where: { buildingId: building.id },
        data: {
          floorId: defaultFloor.id,
          distance: 0,
        },
      });
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
```

### Rollback Strategy

```typescript
// In case of issues, provide rollback capability
async function rollbackLocationHierarchy() {
  const prisma = new PrismaClient();

  try {
    // 1. Remove floorId from rooms (set to null if made nullable)
    // 2. Delete all floors
    // 3. Remove blockId from buildings
    // 4. Delete all blocks
    // 5. Remove distance columns (if possible)

    console.log("Rollback completed");
  } catch (error) {
    console.error("Rollback failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
```

## Security Considerations

### Authentication & Authorization

```typescript
// Role-based access control
const rolePermissions = {
  Admin: [
    "create:teacher",
    "read:teacher",
    "update:teacher",
    "delete:teacher",
    "create:location",
    "update:location",
    "delete:location",
    "read:all-bookings",
  ],
  Teacher: [
    "search:rooms",
    "create:booking",
    "read:own-bookings",
    "delete:own-bookings",
  ],
  Student: ["read:own-profile", "update:own-profile"],
};

// Middleware to check permissions
function requirePermission(permission: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole || !rolePermissions[userRole]?.includes(permission)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
```

### Input Validation

```typescript
// Sanitize all user inputs
import { body, param, query } from "express-validator";

// Example: Room booking validation
const validateBookingCreation = [
  body("roomId").isString().trim().notEmpty(),
  body("branch").isIn(Object.values(Branch)),
  body("capacity").isInt({ min: 1, max: 1000 }),
  body("startTime").isISO8601().toDate(),
  body("endTime").isISO8601().toDate(),
  body("endTime").custom((endTime, { req }) => {
    return new Date(endTime) > new Date(req.body.startTime);
  }),
];
```

### Data Privacy

```typescript
// Ensure teachers can only see their own bookings
router.get("/api/room-bookings", authenticateToken, async (req, res) => {
  const { teacherId } = req.query;

  // Non-admin users can only query their own bookings
  if (req.user?.role !== "Admin" && teacherId !== req.user?.id) {
    return res
      .status(403)
      .json({ error: "Cannot access other users' bookings" });
  }

  // Proceed with query
});
```

### Rate Limiting

```typescript
// Prevent abuse of room search endpoint
import rateLimit from 'express-rate-limit';

const searchRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many search requests, please try again later'
});

router.post('/api/room-bookings/search', searchRateLimiter, ...);
```

## Performance Optimization

### Database Indexing

```prisma
// Indexes for efficient queries
model RoomBooking {
  // ... fields ...

  @@index([roomId, startTime, endTime]) // For overlap detection
  @@index([teacherId]) // For teacher's bookings
  @@index([status]) // For status-based queries
  @@index([endTime]) // For expiration service
}

model Room {
  // ... fields ...

  @@index([floorId]) // For floor-based queries
  @@index([capacity]) // For capacity-based searches
}
```

### Caching Strategy

```typescript
// Cache room search results for common queries
import NodeCache from "node-cache";

const searchCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

async function searchRooms(criteria: SearchCriteria) {
  const cacheKey = JSON.stringify(criteria);
  const cached = searchCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const results = await performRoomSearch(criteria);
  searchCache.set(cacheKey, results);

  return results;
}

// Invalidate cache when bookings are created/deleted
function invalidateSearchCache() {
  searchCache.flushAll();
}
```

### Query Optimization

```typescript
// Use select to fetch only needed fields
const rooms = await prisma.room.findMany({
  where: { capacity: { gte: criteria.capacity } },
  select: {
    id: true,
    name: true,
    capacity: true,
    distance: true,
    floor: {
      select: {
        id: true,
        name: true,
        distance: true,
        building: {
          select: {
            id: true,
            name: true,
            code: true,
            distance: true,
            block: {
              select: {
                id: true,
                name: true,
                distance: true,
              },
            },
          },
        },
      },
    },
  },
});

// Use pagination for large result sets
const PAGE_SIZE = 20;

async function getBookings(page: number, teacherId?: string) {
  return prisma.roomBooking.findMany({
    where: { teacherId },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    orderBy: { startTime: "desc" },
  });
}
```

## Deployment Considerations

### Environment Variables

```bash
# .env additions
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
BOOKING_EXPIRATION_INTERVAL=300000  # 5 minutes in ms
SEARCH_CACHE_TTL=300  # 5 minutes in seconds
```

### Scheduled Jobs

```typescript
// Use node-cron for booking expiration
import cron from "node-cron";

// Run every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  await bookingExpirationService.updateBookingStatuses();
});
```

### Monitoring

```typescript
// Log important events
logger.info("Room booking created", {
  bookingId: booking.id,
  teacherId: booking.teacherId,
  roomId: booking.roomId,
  startTime: booking.startTime,
});

logger.warn("Room booking conflict detected", {
  roomId: room.id,
  requestedTime: { startTime, endTime },
});

// Track metrics
metrics.increment("room_bookings.created");
metrics.increment("room_bookings.expired");
metrics.timing("room_search.duration", searchDuration);
```
