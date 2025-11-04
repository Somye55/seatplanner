import { PrismaClient, Seat, Student, SeatStatus, Branch, Room } from '../../generated/prisma/client';

const prisma = new PrismaClient();

export interface AllocationResult {
  allocatedCount: number;
  unallocatedCount: number;
  unallocatedStudents: { student: Student; reason: string }[];
  utilization?: number;
}

export interface ReallocationResult {
    success: boolean;
    student: Student | null;
    newSeat?: Seat | null;
    message: string;
}

export class AllocationService {

  static async reallocateStudent(studentId: string, buildingId: string, roomId: string): Promise<ReallocationResult> {
    try {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (!student) {
        return { success: false, student: null, message: 'Student not found' };
      }

      // Find available seats in the same building, excluding the current room
      const availableSeats = await prisma.seat.findMany({
        where: {
          room: {
            buildingId: buildingId,
            id: { not: roomId }
          },
          status: SeatStatus.Available
        },
        include: { room: true },
        orderBy: [{ row: 'asc' }, { col: 'asc' }]
      });

      // Find a suitable seat
      const suitableSeat = availableSeats.find(seat =>
        student.accessibilityNeeds.every(need => seat.features.includes(need))
      );

      if (!suitableSeat) {
        return { success: false, student, message: 'No suitable seats available for reallocation' };
      }

      // Allocate the new seat
      await prisma.$transaction(async (tx) => {
        await tx.seat.update({
          where: { id: suitableSeat.id },
          data: { status: SeatStatus.Allocated, studentId: student.id, version: { increment: 1 } }
        });
        await tx.room.update({
          where: { id: suitableSeat.roomId },
          data: { claimed: { increment: 1 } }
        });
      });

      return { success: true, student, newSeat: suitableSeat, message: 'Student reallocated successfully' };
    } catch (error) {
      console.error('Reallocation failed:', error);
      return { success: false, student: null, message: 'Reallocation failed due to an error' };
    }
  }

  static async allocateBranchToBuilding(branch: Branch, buildingId: string): Promise<{ summary: AllocationResult }> {
    const studentsOfBranch = await prisma.student.findMany({ where: { branch } });

    const roomsInBuilding = await prisma.room.findMany({ where: { buildingId } });
    const roomIdsInBuilding = roomsInBuilding.map(r => r.id);

    // Identify rooms eligible for this allocation.
    // A room is eligible if it's not allocated at all, or already allocated to the SAME branch.
    const eligibleRooms = roomsInBuilding.filter(r => !r.branchAllocated || r.branchAllocated === branch);
    const eligibleRoomIds = eligibleRooms.map(r => r.id);

    if (eligibleRoomIds.length === 0) {
        return { summary: {
            allocatedCount: 0,
            unallocatedCount: studentsOfBranch.length,
            unallocatedStudents: studentsOfBranch.map(s => ({ student: s, reason: "No rooms available in the building for this branch." }))
        }};
    }
    
    // Make operation idempotent: Clear previous allocations for THIS branch in THIS building.
    const seatsToClear = await prisma.seat.findMany({
      where: {
        roomId: { in: roomIdsInBuilding },
        student: { branch: branch }
      }
    });
    const seatIdsToClear = seatsToClear.map(s => s.id);

    if (seatIdsToClear.length > 0) {
        await prisma.seat.updateMany({
            where: { id: { in: seatIdsToClear } },
            data: { status: SeatStatus.Available, studentId: null, version: { increment: 1 } }
        });
    }

    // Reset room statuses and claimed counts for rooms previously allocated to this branch
    await prisma.room.updateMany({
        where: { id: { in: eligibleRoomIds }, branchAllocated: branch },
        data: { branchAllocated: null, claimed: 0 }
    });

    // Fetch all available seats in the eligible rooms.
    const availableSeats = await prisma.seat.findMany({
      where: { 
          roomId: { in: eligibleRoomIds },
          status: SeatStatus.Available
      },
      orderBy: [{ roomId: 'asc' }, { row: 'asc' }, { col: 'asc' }] // Process room by room
    });
    
    let allocatedCount = 0;
    const unallocatedStudents: { student: Student; reason: string }[] = [];
    let seatsInUse = [...availableSeats];

    const priorityStudents = studentsOfBranch.filter(s => s.accessibilityNeeds.length > 0);
    const otherStudents = studentsOfBranch.filter(s => s.accessibilityNeeds.length === 0);

    for (const student of [...priorityStudents, ...otherStudents]) {
        const suitableSeatIndex = seatsInUse.findIndex(seat =>
            student.accessibilityNeeds.every(need => seat.features.includes(need))
        );
        
        if (suitableSeatIndex > -1) {
            const seatToAllocate = seatsInUse[suitableSeatIndex];
            const roomForSeat = eligibleRooms.find(r => r.id === seatToAllocate.roomId);

            await prisma.$transaction(async (tx) => {
                await tx.seat.update({
                    where: { id: seatToAllocate.id },
                    data: { status: SeatStatus.Allocated, studentId: student.id, version: { increment: 1 } }
                });
                if (roomForSeat && !roomForSeat.branchAllocated) {
                    await tx.room.update({
                        where: { id: roomForSeat.id },
                        data: { branchAllocated: branch, claimed: { increment: 1 } }
                    });
                    // Update in-memory state for subsequent loops
                    roomForSeat.branchAllocated = branch; 
                } else {
                     await tx.room.update({
                        where: { id: seatToAllocate.roomId },
                        data: { claimed: { increment: 1 } }
                    });
                }
            });

            seatsInUse.splice(suitableSeatIndex, 1);
            allocatedCount++;
        } else {
            unallocatedStudents.push({ student, reason: 'No suitable seats available in the building.' });
        }
    }

    const summary: AllocationResult = {
      allocatedCount,
      unallocatedCount: unallocatedStudents.length,
      unallocatedStudents
    };

    return { summary };
  }
}
