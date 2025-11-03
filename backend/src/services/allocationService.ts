import { PrismaClient, Seat, Student } from '../generated/prisma/client';

const prisma = new PrismaClient();

export interface AllocationResult {
  allocatedCount: number;
  unallocatedCount: number;
  unallocatedStudents: { student: Student; reason: string }[];
  utilization: number;
}

export interface RebalanceResult {
  reallocatedCount: number;
  stillUnassignedCount: number;
  stillUnassigned: { student: Student; reason: string }[];
}

export class AllocationService {
  static async allocate(): Promise<{ seats: (Seat & { student: Student | null })[]; summary: AllocationResult }> {
    // 1. Reset all previously allocated seats to make the operation idempotent.
    // This also increments the version for optimistic locking clients.
    await prisma.seat.updateMany({
      where: { status: 'Allocated' },
      data: { status: 'Available', studentId: null, version: { increment: 1 } }
    });

    // Invalidate cache for all rooms since seat statuses have changed
    const { invalidateCache } = await import('../middleware/cache');
    await invalidateCache('room-seats:*');

    // 2. Fetch all available seats and all students.
    const availableSeats = await prisma.seat.findMany({
      where: { status: 'Available' },
      orderBy: [{ row: 'asc' }, { col: 'asc' }] // Sort for deterministic allocation
    });

    const studentsToAllocate = await prisma.student.findMany();

    let allocatedCount = 0;
    const unallocatedStudents: { student: Student; reason: string }[] = [];
    let seatsInUse = [...availableSeats];

    // 3. Prioritize students with accessibility needs.
    const priorityStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length > 0);
    const otherStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length === 0);

    const allocateStudent = async (student: Student) => {
      // Find a seat that matches all of the student's accessibility needs
      const suitableSeatIndex = seatsInUse.findIndex(seat =>
        student.accessibilityNeeds.every((need: string) => seat.features.includes(need))
      );
      
      if (suitableSeatIndex > -1) {
        const seatToAllocate = seatsInUse[suitableSeatIndex];
        
        await prisma.seat.update({
          where: { id: seatToAllocate.id },
          data: { status: 'Allocated', studentId: student.id, version: { increment: 1 } }
        });

        // Remove the allocated seat from the available pool for this run
        seatsInUse.splice(suitableSeatIndex, 1);
        allocatedCount++;
      } else {
        unallocatedStudents.push({ student, reason: 'No suitable seats available.' });
      }
    };

    // 4. Allocate priority students first, then others.
    for (const student of [...priorityStudents, ...otherStudents]) {
      await allocateStudent(student);
    }
    
    // 5. Calculate summary metrics.
    const totalUsableSeats = await prisma.seat.count({
      where: { status: { not: 'Broken' } }
    });

    const finalSeats = await prisma.seat.findMany({ include: { student: true } });

    const summary: AllocationResult = {
      allocatedCount,
      unallocatedCount: unallocatedStudents.length,
      unallocatedStudents,
      utilization: totalUsableSeats > 0 ? (allocatedCount / totalUsableSeats) * 100 : 0
    };

    return { seats: finalSeats, summary };
  }

  static async rebalance(): Promise<{ seats: (Seat & { student: Student | null })[]; summary: RebalanceResult }> {
    // 1. Find students who are currently unassigned.
    const unassignedStudents = await prisma.student.findMany({
      where: {
        seats: {
          none: {}
        }
      }
    });

    // Invalidate cache for all rooms since seat statuses may change
    const { invalidateCache } = await import('../middleware/cache');
    await invalidateCache('room-seats:*');

    if (unassignedStudents.length === 0) {
      const seats = await prisma.seat.findMany({ include: { student: true } });
      return { seats, summary: { reallocatedCount: 0, stillUnassignedCount: 0, stillUnassigned: [] }};
    }

    // 2. Fetch available seats.
    const availableSeats = await prisma.seat.findMany({
      where: { status: 'Available' },
      orderBy: [{ row: 'asc' }, { col: 'asc' }]
    });

    let reallocatedCount = 0;
    const stillUnassigned: { student: Student; reason: string }[] = [];
    let seatsInUse = [...availableSeats];

    const reallocateStudent = async (student: Student) => {
      const suitableSeatIndex = seatsInUse.findIndex(seat =>
        student.accessibilityNeeds.every((need: string) => seat.features.includes(need))
      );

      if (suitableSeatIndex > -1) {
        const seatToAllocate = seatsInUse[suitableSeatIndex];
        
        await prisma.seat.update({
          where: { id: seatToAllocate.id },
          data: { status: 'Allocated', studentId: student.id, version: { increment: 1 } }
        });

        seatsInUse.splice(suitableSeatIndex, 1);
        reallocatedCount++;
      } else {
        stillUnassigned.push({ student, reason: 'No suitable seats available for reallocation.' });
      }
    };
    
    // 3. Attempt to reallocate each unassigned student.
    for (const student of unassignedStudents) {
      await reallocateStudent(student);
    }

    const finalSeats = await prisma.seat.findMany({ include: { student: true } });

    const summary: RebalanceResult = {
      reallocatedCount,
      stillUnassignedCount: stillUnassigned.length,
      stillUnassigned
    };

    return { seats: finalSeats, summary };
  }
}
