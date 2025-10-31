import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

export interface AllocationResult {
  allocatedCount: number;
  unallocatedCount: number;
  unallocatedStudents: { student: any; reason: string }[];
  utilization: number;
}

export interface RebalanceResult {
  reallocatedCount: number;
  stillUnassignedCount: number;
  stillUnassigned: { student: any; reason: string }[];
}

export class AllocationService {
  static async allocate(): Promise<{ seats: any[]; summary: AllocationResult }> {
    // Reset all allocated seats
    await prisma.seat.updateMany({
      where: { status: 'Allocated' },
      data: { status: 'Available', studentId: null }
    });

    // Get available seats sorted by row
    const availableSeats = await prisma.seat.findMany({
      where: { status: 'Available' },
      orderBy: { row: 'asc' }
    });

    // Get students not yet allocated
    const allocatedStudentIds = await prisma.seat.findMany({
      where: { status: 'Allocated' },
      select: { studentId: true }
    }).then(seats => seats.map(s => s.studentId).filter(Boolean));

    const studentsToAllocate = await prisma.student.findMany({
      where: {
        id: { notIn: allocatedStudentIds.filter(Boolean) as string[] }
      }
    });

    let allocatedCount = 0;
    const unallocatedStudents: { student: any; reason: string }[] = [];

    const priorityStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length > 0);
    const otherStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length === 0);

    const allocate = async (student: any) => {
      let seatFound = false;
      if (student.accessibilityNeeds.includes('front_row')) {
        const frontRowSeat = availableSeats.find(s => s.row <= 1 && s.features.includes('front_row'));
        if (frontRowSeat) {
          await prisma.seat.update({
            where: { id: frontRowSeat.id },
            data: { status: 'Allocated', studentId: student.id }
          });
          availableSeats.splice(availableSeats.indexOf(frontRowSeat), 1);
          allocatedCount++;
          seatFound = true;
        }
      }

      if (!seatFound) {
        // Find a seat that matches all accessibility needs
        const suitableSeat = availableSeats.find(seat =>
          student.accessibilityNeeds.every((need: string) => seat.features.includes(need))
        );
        if (suitableSeat) {
          await prisma.seat.update({
            where: { id: suitableSeat.id },
            data: { status: 'Allocated', studentId: student.id }
          });
          availableSeats.splice(availableSeats.indexOf(suitableSeat), 1);
          allocatedCount++;
          seatFound = true;
        }
      }

      if (!seatFound) {
        unallocatedStudents.push({ student, reason: 'No suitable seats available.' });
      }
    };

    for (const student of [...priorityStudents, ...otherStudents]) {
      await allocate(student);
    }

    const totalSeats = await prisma.seat.count({
      where: { status: { not: 'Broken' } }
    });

    const seats = await prisma.seat.findMany();

    const summary: AllocationResult = {
      allocatedCount,
      unallocatedCount: unallocatedStudents.length,
      unallocatedStudents,
      utilization: totalSeats > 0 ? (allocatedCount / totalSeats) * 100 : 0
    };

    return { seats, summary };
  }

  static async rebalance(): Promise<{ seats: any[]; rebalanceSummary: RebalanceResult }> {
    // Find students who were unassigned due to seat changes
    const unassignedStudents = await prisma.student.findMany({
      where: {
        seat: null
      }
    });

    // Get available seats
    const availableSeats = await prisma.seat.findMany({
      where: { status: 'Available' },
      orderBy: { row: 'asc' }
    });

    let reallocatedCount = 0;
    const stillUnassigned: { student: any; reason: string }[] = [];

    const reallocate = async (student: any) => {
      let seatFound = false;
      // Find a seat that matches all accessibility needs
      const suitableSeat = availableSeats.find(seat =>
        student.accessibilityNeeds.every((need: string) => seat.features.includes(need))
      );
      if (suitableSeat) {
        await prisma.seat.update({
          where: { id: suitableSeat.id },
          data: { status: 'Allocated', studentId: student.id }
        });
        availableSeats.splice(availableSeats.indexOf(suitableSeat), 1);
        reallocatedCount++;
        seatFound = true;
      }

      if (!seatFound) {
        stillUnassigned.push({ student, reason: 'No suitable seats available for reallocation.' });
      }
    };

    for (const student of unassignedStudents) {
      await reallocate(student);
    }

    const seats = await prisma.seat.findMany();

    const rebalanceSummary: RebalanceResult = {
      reallocatedCount,
      stillUnassignedCount: stillUnassigned.length,
      stillUnassigned
    };

    return { seats, rebalanceSummary };
  }
}