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
        if (row === 0) {
          features.push('front_row');
        } else if (row === rows - 1) {
          features.push('back_row');
        } else {
          features.push('middle_row');
        }

        // --- REVISED LOGIC for aisle and middle seats ---

        // Aisle seat tagging (outer edges of room and inner edges of banks)
        const isOuterAisle = col === 0 || col === cols - 1;
        let isInnerAisle = false;
        if (banks.length > 1) {
            isInnerAisle = banks.some(bank => (col === bank.endCol || col === bank.startCol));
        }
        if (isOuterAisle || isInnerAisle) {
            features.push('aisle_seat');
        }

        // Middle of row seat tagging (relative to each bank)
        for (const bank of banks) {
            if (col >= bank.startCol && col <= bank.endCol) {
                const bankCols = bank.endCol - bank.startCol + 1;
                const relativeCol = col - bank.startCol; 
                
                // Only odd-sized banks have a single true middle seat
                if (bankCols % 2 !== 0) {
                    const middleColInBank = Math.floor(bankCols / 2);
                    if (relativeCol === middleColInBank) {
                        features.push('middle_column_seat');
                    }
                }
            }
        }
        // --- END REVISED LOGIC ---

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
