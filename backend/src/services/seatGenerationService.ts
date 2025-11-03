import { PrismaClient, SeatStatus } from '../../generated/prisma/client';

export class SeatGenerationService {
  static async generateSeatsForRoom(roomId: string, capacity: number, prisma: PrismaClient): Promise<void> {
    const cols = 10; // Assume 10 seats per row
    const rows = Math.ceil(capacity / cols);

    const seatsData = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 1; col <= cols; col++) {
        const seatIndex = row * cols + (col - 1);
        if (seatIndex >= capacity) break;

        const label = `${String.fromCharCode(65 + row)}${col}`;
        seatsData.push({
          roomId,
          label,
          row,
          col,
          features: [],
          status: SeatStatus.Available,
          version: 1
        });
      }
    }

    await prisma.seat.createMany({
      data: seatsData
    });
  }
}
