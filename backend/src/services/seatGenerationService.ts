import { PrismaClient, SeatStatus } from '../../generated/prisma/client';

export class SeatGenerationService {
  static async generateSeatsForRoom(roomId: string, capacity: number, rows: number, cols: number, prisma: PrismaClient): Promise<void> {

    const seatsData: Array<{ roomId: string; label: string; row: number; col: number; features: string[]; status: SeatStatus; version: number; }> = [];
    let createdSeatsCount = 0;

    // --- NEW LOGIC for defining seat banks ---
    const banks: { startCol: number; endCol: number }[] = [];
    // This logic mimics the frontend's visual split after the 3rd column (index 2)
    // to create a main aisle for wider rooms.
    const aisleAfterColIndex = 2; 
    if (cols > 3) {
        banks.push({ startCol: 0, endCol: aisleAfterColIndex });
        banks.push({ startCol: aisleAfterColIndex + 1, endCol: cols - 1 });
    } else {
        // For narrow rooms, treat as a single bank
        banks.push({ startCol: 0, endCol: cols - 1 });
    }
    // --- END NEW LOGIC ---

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (createdSeatsCount >= capacity) break;

        const label = `${String.fromCharCode(65 + row)}${col + 1}`;
        const features: string[] = [];

        // Add positional features based on row
        // Front seat = first row only
        if (row === 0) {
          features.push('front_seat');
        }
        // Note: Last row doesn't get a special tag

        // Aisle seat tagging (outer edges of room and inner edges of banks)
        const isOuterAisle = col === 0 || col === cols - 1;
        let isInnerAisle = false;
        if (banks.length > 1) {
            isInnerAisle = banks.some(bank => (col === bank.endCol || col === bank.startCol));
        }
        if (isOuterAisle || isInnerAisle) {
            features.push('aisle_seat');
        }

        // Middle seat = seats that are NOT on the edges of their bank (not aisle seats within the bank)
        // Find which bank this column belongs to
        const currentBank = banks.find(bank => col >= bank.startCol && col <= bank.endCol);
        if (currentBank) {
          const bankWidth = currentBank.endCol - currentBank.startCol + 1;
          const colInBank = col - currentBank.startCol;
          // A seat is a middle seat if it's not on the edge of its bank and the bank has at least 3 seats
          if (bankWidth >= 3 && colInBank > 0 && colInBank < bankWidth - 1) {
            features.push('middle_seat');
          }
        }

        seatsData.push({
          roomId,
          label,
          row,
          col,
          features: [...new Set(features)], // Ensure no duplicate tags
          status: SeatStatus.Available,
          version: 1,
        });

        createdSeatsCount++;
      }
      if (createdSeatsCount >= capacity) break;
    }

    // Use a transaction to delete old seats and create new ones atomically
    await prisma.$transaction(async (tx) => {
        // Delete existing seats for this room to ensure a clean slate
        await tx.seat.deleteMany({
          where: { roomId },
        });

        // Create the new seats if any were generated
        if (seatsData.length > 0) {
          await tx.seat.createMany({
            data: seatsData,
          });
        }

        // Reset claimed count on the room
        await tx.room.update({
            where: { id: roomId },
            data: { claimed: 0 }
        });
    });
  }
}
