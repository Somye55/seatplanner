import { PrismaClient } from '../generated/prisma/client';

export class SeatGenerationService {
  static async generateSeatsForRoom(roomId: string, capacity: number, prisma: PrismaClient): Promise<void> {
    const seats = [];

    // Assume 10 seats per row for a simple grid layout
    const seatsPerRow = 10;
    const rows = Math.ceil(capacity / seatsPerRow);

    for (let i = 0; i < capacity; i++) {
      const row = Math.floor(i / seatsPerRow) + 1;
      const col = (i % seatsPerRow) + 1;
      const label = `${String.fromCharCode(65 + row - 1)}${col}`; // A1, A2, ..., B1, etc.

      seats.push({
        roomId,
        label,
        row,
        col,
        features: [],
        status: 'Available' as const,
        version: 1
      });
    }

    // Bulk insert seats
    await prisma.seat.createMany({
      data: seats
    });
  }
}