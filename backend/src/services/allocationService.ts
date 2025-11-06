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
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
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

        // Allocate the new seat with optimistic locking
        const result = await prisma.$transaction(async (tx) => {
          // Verify seat is still available with current version
          const currentSeat = await tx.seat.findUnique({
            where: { id: suitableSeat.id }
          });

          if (!currentSeat || currentSeat.status !== SeatStatus.Available || currentSeat.version !== suitableSeat.version) {
            throw new Error('SEAT_CONFLICT');
          }

          // Verify room hasn't changed
          const currentRoom = await tx.room.findUnique({
            where: { id: suitableSeat.roomId }
          });

          if (!currentRoom || currentRoom.version !== suitableSeat.room.version) {
            throw new Error('ROOM_CONFLICT');
          }

          // Update seat
          await tx.seat.update({
            where: { 
              id: suitableSeat.id,
              version: suitableSeat.version
            },
            data: { 
              status: SeatStatus.Allocated, 
              studentId: student.id, 
              version: { increment: 1 } 
            }
          });

          // Update room
          await tx.room.update({
            where: { 
              id: suitableSeat.roomId,
              version: suitableSeat.room.version
            },
            data: { 
              claimed: { increment: 1 },
              version: { increment: 1 },
              branchAllocated: suitableSeat.room.branchAllocated || student.branch
            }
          });

          return suitableSeat;
        });

        return { success: true, student, newSeat: result, message: 'Student reallocated successfully' };
      } catch (error: any) {
        if (error.message === 'SEAT_CONFLICT' || error.message === 'ROOM_CONFLICT') {
          attempt++;
          if (attempt >= maxRetries) {
            return { success: false, student: null, message: 'Reallocation failed due to concurrent modifications. Please try again.' };
          }
          // Wait briefly before retry
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          continue;
        }
        console.error('Reallocation failed:', error);
        return { success: false, student: null, message: 'Reallocation failed due to an error' };
      }
    }

    return { success: false, student: null, message: 'Reallocation failed after multiple retries' };
  }

  static async allocateBranchToBuilding(branch: Branch, buildingId: string): Promise<{ summary: AllocationResult }> {
    console.log(`Starting allocation for branch ${branch} to building ${buildingId}`);
    // Use a single transaction for the entire allocation to prevent race conditions
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch only students of the specified branch who are currently unallocated.
      const studentsToAllocate = await tx.student.findMany({
        where: {
          branch: branch,
          seats: {
            none: {}
          }
        }
      });
      console.log(`Found ${studentsToAllocate.length} unallocated students for branch ${branch}`);
      
      // 2. Find rooms in the target building that are either unallocated or already allocated to the same branch.
      const eligibleRooms = await tx.room.findMany({
        where: {
          buildingId,
          OR: [
            { branchAllocated: null },
            { branchAllocated: branch }
          ]
        }
      });
      const eligibleRoomIds = eligibleRooms.map(r => r.id);
      console.log(`Found ${eligibleRooms.length} eligible rooms in building ${buildingId}`);

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
      
      // 3. Fetch all available seats in the eligible rooms with FOR UPDATE lock
      const availableSeats = await tx.seat.findMany({
        where: { 
          roomId: { in: eligibleRoomIds },
          status: SeatStatus.Available
        },
        orderBy: [{ roomId: 'asc' }, { row: 'asc' }, { col: 'asc' }]
      });
      console.log(`Found ${availableSeats.length} available seats in eligible rooms`);
      
      let allocatedCount = 0;
      const unallocatedStudents: { student: Student; reason: string }[] = [];
      let seatsInUse = [...availableSeats];
      const affectedRoomIds: string[] = [];
      const roomVersions = new Map(eligibleRooms.map(r => [r.id, r.version]));

      const priorityStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length > 0);
      const otherStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length === 0);

      // 4. Loop through students and assign them to seats.
      for (const student of [...priorityStudents, ...otherStudents]) {
        const suitableSeatIndex = seatsInUse.findIndex(seat =>
          student.accessibilityNeeds.every(need => seat.features.includes(need))
        );
        
        if (suitableSeatIndex > -1) {
          const seatToAllocate = seatsInUse.splice(suitableSeatIndex, 1)[0];
          const roomForSeat = eligibleRooms.find(r => r.id === seatToAllocate.roomId);

          if (!roomForSeat) continue;

          // Update seat with version check
          await tx.seat.update({
            where: { 
              id: seatToAllocate.id,
              version: seatToAllocate.version
            },
            data: { 
              status: SeatStatus.Allocated, 
              studentId: student.id, 
              version: { increment: 1 } 
            }
          });

          // Update room with version check
          const currentRoomVersion = roomVersions.get(roomForSeat.id) || roomForSeat.version;
          await tx.room.update({
            where: { 
              id: roomForSeat.id,
              version: currentRoomVersion
            },
            data: { 
              branchAllocated: roomForSeat.branchAllocated || branch,
              claimed: { increment: 1 },
              version: { increment: 1 }
            }
          });

          // Update in-memory state
          roomVersions.set(roomForSeat.id, currentRoomVersion + 1);
          if (!roomForSeat.branchAllocated) {
            roomForSeat.branchAllocated = branch;
          }

          // Track affected room
          if (!affectedRoomIds.includes(roomForSeat.id)) {
            affectedRoomIds.push(roomForSeat.id);
          }

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

      console.log(`Allocation complete: ${allocatedCount} allocated, ${unallocatedStudents.length} unallocated, ${affectedRoomIds.length} rooms affected`);
      return { summary };
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot
      timeout: 30000, // Maximum time for the transaction to complete
      isolationLevel: 'Serializable' // Highest isolation level to prevent race conditions
    });
  }

  static async allocateBranchToRoom(branch: Branch, roomId: string): Promise<{ summary: AllocationResult }> {
    console.log(`Starting allocation for branch ${branch} to room ${roomId}`);
    // Use a single transaction for the entire allocation to prevent race conditions
    return await prisma.$transaction(async (tx) => {
      // 1. Check if the room is already allocated or not with lock
      const room = await tx.room.findUnique({
        where: { id: roomId }
      });
      if (!room) {
        throw new Error('Room not found');
      }
      if (room.branchAllocated) {
        throw new Error('Room is already allocated to a branch');
      }

      // 2. Fetch only students of the specified branch who are currently unallocated.
      const studentsToAllocate = await tx.student.findMany({
        where: {
          branch: branch,
          seats: {
            none: {}
          }
        }
      });
      console.log(`Found ${studentsToAllocate.length} unallocated students for branch ${branch}`);

      // If there are no students to allocate, exit early.
      if (studentsToAllocate.length === 0) {
        return { summary: { allocatedCount: 0, unallocatedCount: 0, unallocatedStudents: [], affectedRoomIds: [] } };
      }

      // 3. Fetch all available seats in the room.
      const availableSeats = await tx.seat.findMany({
        where: {
          roomId: roomId,
          status: SeatStatus.Available
        },
        orderBy: [{ row: 'asc' }, { col: 'asc' }]
      });
      console.log(`Found ${availableSeats.length} available seats in room ${roomId}`);

      if (availableSeats.length === 0) {
        return { summary: {
          allocatedCount: 0,
          unallocatedCount: studentsToAllocate.length,
          unallocatedStudents: studentsToAllocate.map(s => ({ student: s, reason: "No available seats in the room." })),
          affectedRoomIds: []
        }};
      }

      let allocatedCount = 0;
      const unallocatedStudents: { student: Student; reason: string }[] = [];
      let seatsInUse = [...availableSeats];
      const affectedRoomIds: string[] = [roomId];
      let currentRoomVersion = room.version;
      let roomAlreadyMarked = false;

      const priorityStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length > 0);
      const otherStudents = studentsToAllocate.filter(s => s.accessibilityNeeds.length === 0);

      // 4. Loop through students and assign them to seats.
      for (const student of [...priorityStudents, ...otherStudents]) {
        const suitableSeatIndex = seatsInUse.findIndex(seat =>
          student.accessibilityNeeds.every(need => seat.features.includes(need))
        );

        if (suitableSeatIndex > -1) {
          const seatToAllocate = seatsInUse.splice(suitableSeatIndex, 1)[0];

          // Update seat with version check
          await tx.seat.update({
            where: { 
              id: seatToAllocate.id,
              version: seatToAllocate.version
            },
            data: { 
              status: SeatStatus.Allocated, 
              studentId: student.id, 
              version: { increment: 1 } 
            }
          });

          // Update room with version check
          await tx.room.update({
            where: { 
              id: roomId,
              version: currentRoomVersion
            },
            data: { 
              branchAllocated: roomAlreadyMarked ? undefined : branch,
              claimed: { increment: 1 },
              version: { increment: 1 }
            }
          });

          currentRoomVersion++;
          roomAlreadyMarked = true;
          allocatedCount++;
        } else {
          unallocatedStudents.push({ student, reason: 'No suitable seats available in the room.' });
        }
      }

      const summary: AllocationResult = {
        allocatedCount,
        unallocatedCount: unallocatedStudents.length,
        unallocatedStudents,
        affectedRoomIds
      };

      console.log(`Room allocation complete: ${allocatedCount} allocated, ${unallocatedStudents.length} unallocated`);
      return { summary };
    }, {
      maxWait: 10000,
      timeout: 30000,
      isolationLevel: 'Serializable'
    });
  }
}
