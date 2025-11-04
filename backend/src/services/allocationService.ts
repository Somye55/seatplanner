import { PrismaClient, Seat, Student, SeatStatus, Branch, Room } from '../../generated/prisma/client';

const prisma = new PrismaClient();

export interface AllocationResult {
  allocatedCount: number;
  unallocatedCount: number;
  unallocatedStudents: { student: Student; reason: string }[];
  utilization?: number;
  affectedRoomIds: string[];
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

      // Find available seats in ELIGIBLE rooms in the same building (excluding the current room).
      // An eligible room is one that is either unallocated or allocated to the student's own branch.
      const availableSeats = await prisma.seat.findMany({
        where: {
          room: {
            buildingId: buildingId,
            id: { not: roomId },
            OR: [
              { branchAllocated: null },
              { branchAllocated: student.branch }
            ]
          },
          status: SeatStatus.Available
        },
        include: { room: true },
        orderBy: [{ row: 'asc' }, { col: 'asc' }]
      });

      // Find a suitable seat that matches accessibility needs
      const suitableSeat = availableSeats.find(seat =>
        student.accessibilityNeeds.every(need => seat.features.includes(need))
      );

      if (!suitableSeat) {
        return { success: false, student, message: 'No suitable seats available for reallocation in this building.' };
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
        // If the new room was unallocated, assign the student's branch to it
        if (!suitableSeat.room.branchAllocated) {
          await tx.room.update({
            where: { id: suitableSeat.roomId },
            data: { branchAllocated: student.branch }
          });
        }
      });

      return { success: true, student, newSeat: suitableSeat, message: 'Student reallocated successfully' };
    } catch (error) {
      console.error('Reallocation failed:', error);
      return { success: false, student: null, message: 'Reallocation failed due to an error' };
    }
  }

  static async allocateBranchToBuilding(branch: Branch, buildingId: string): Promise<{ summary: AllocationResult }> {
    // 1. Fetch only students of the specified branch who are currently unallocated.
    const studentsToAllocate = await prisma.student.findMany({
      where: {
        branch: branch, // Using shorthand syntax for equality
        seats: {
          none: {}
        }
      }
    });
    
    // 2. Find rooms in the target building that are either unallocated or already allocated to the same branch.
    // This is more efficient than fetching all rooms and filtering in application memory.
    const eligibleRooms = await prisma.room.findMany({
      where: {
        buildingId,
        OR: [
          { branchAllocated: null },
          { branchAllocated: branch }
        ]
      }
    });
    const eligibleRoomIds = eligibleRooms.map(r => r.id);

    // If there are no students to allocate or no eligible rooms, exit early.
     if (studentsToAllocate.length === 0) {
         return { summary: { allocatedCount: 0, unallocatedCount: 0, unallocatedStudents: [], affectedRoomIds: [] } };
     }
     if (eligibleRoomIds.length === 0) {
         return { summary: {
             allocatedCount: 0,
             unallocatedCount: studentsToAllocate.length,
             unallocatedStudents: studentsToAllocate.map(s => ({ student: s, reason: "No rooms available in the building for this branch." })),
             affectedRoomIds: []
         }};
     }
    
    // 3. Fetch all available seats in the eligible rooms.
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
    const affectedRoomIds: string[] = [];

    const priorityStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length > 0);
    const otherStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length === 0);

    // 4. Loop through students and assign them to seats.
    for (const student of [...priorityStudents, ...otherStudents]) {
        const suitableSeatIndex = seatsInUse.findIndex(seat =>
            student.accessibilityNeeds.every(need => seat.features.includes(need))
        );
        
        if (suitableSeatIndex > -1) {
            const seatToAllocate = seatsInUse.splice(suitableSeatIndex, 1)[0]; // Remove seat from available pool
            const roomForSeat = eligibleRooms.find(r => r.id === seatToAllocate.roomId);

            await prisma.$transaction(async (tx) => {
                await tx.seat.update({
                    where: { id: seatToAllocate.id },
                    data: { status: SeatStatus.Allocated, studentId: student.id, version: { increment: 1 } }
                });

                // If this is the first allocation for this branch in this room, mark the room.
                if (roomForSeat && !roomForSeat.branchAllocated) {
                    await tx.room.update({
                        where: { id: roomForSeat.id },
                        data: { branchAllocated: branch, claimed: { increment: 1 } }
                    });
                    // Update in-memory state for subsequent loops to prevent re-tagging the room
                    roomForSeat.branchAllocated = branch;
                    // Track affected room
                    if (!affectedRoomIds.includes(roomForSeat.id)) {
                        affectedRoomIds.push(roomForSeat.id);
                    }
                } else {
                     await tx.room.update({
                        where: { id: seatToAllocate.roomId },
                        data: { claimed: { increment: 1 } }
                    });
                    // Track affected room
                    if (!affectedRoomIds.includes(seatToAllocate.roomId)) {
                        affectedRoomIds.push(seatToAllocate.roomId);
                    }
                }
            });
            allocatedCount++;
        } else {
            unallocatedStudents.push({ student, reason: 'No suitable seats available in the building.' });
        }
    }

    const summary: AllocationResult = {
      allocatedCount,
      unallocatedCount: unallocatedStudents.length,
      unallocatedStudents,
      affectedRoomIds
    };

    return { summary };
  }
}
