import { PrismaClient } from "../../generated/prisma/client";
import { Server as SocketIOServer } from "socket.io";

const prisma = new PrismaClient();

export class BookingExpirationService {
  private io: SocketIOServer | null = null;

  constructor(io?: SocketIOServer) {
    this.io = io || null;
  }

  /**
   * Set the Socket.io instance for real-time updates
   */
  setSocketIO(io: SocketIOServer): void {
    this.io = io;
  }

  /**
   * Update booking statuses based on current time
   * Transitions: NotStarted → Ongoing → Completed
   */
  async updateBookingStatuses(): Promise<void> {
    const now = new Date();

    try {
      // 1. Update NotStarted → Ongoing (bookings that have started)
      const startedBookings = await prisma.roomBooking.findMany({
        where: {
          status: "NotStarted",
          startTime: { lte: now },
          endTime: { gt: now },
        },
        include: {
          room: true,
          teacher: true,
        },
      });

      for (const booking of startedBookings) {
        await prisma.roomBooking.update({
          where: { id: booking.id },
          data: { status: "Ongoing" },
        });

        console.log(
          `Booking ${booking.id} status updated to Ongoing for room ${booking.room.name}`
        );

        // Emit real-time event
        if (this.io) {
          this.io.emit("bookingStatusChanged", {
            bookingId: booking.id,
            roomId: booking.roomId,
            status: "Ongoing",
            booking: {
              ...booking,
              status: "Ongoing",
            },
          });
        }
      }

      // 2. Update Ongoing/NotStarted → Completed (bookings that have ended)
      const expiredBookings = await prisma.roomBooking.findMany({
        where: {
          status: { in: ["NotStarted", "Ongoing"] },
          endTime: { lte: now },
        },
        include: {
          room: true,
          teacher: true,
        },
      });

      for (const booking of expiredBookings) {
        // Deallocate students from the room when booking expires
        try {
          // Find all students from this branch that are allocated to this room
          const allocatedSeats = await prisma.seat.findMany({
            where: {
              roomId: booking.roomId,
              status: "Allocated",
              student: {
                branch: booking.branch,
              },
            },
            include: {
              student: true,
            },
          });

          // Deallocate all seats for students from this branch
          if (allocatedSeats.length > 0) {
            await prisma.$transaction(async (tx) => {
              // Update all seats to Available and remove student assignment
              await tx.seat.updateMany({
                where: {
                  id: { in: allocatedSeats.map((s) => s.id) },
                },
                data: {
                  status: "Available",
                  studentId: null,
                },
              });

              // Update room claimed count and potentially clear branchAllocated
              const room = await tx.room.findUnique({
                where: { id: booking.roomId },
                include: {
                  seats: {
                    where: {
                      status: "Allocated",
                    },
                  },
                },
              });

              if (room) {
                const remainingAllocatedCount =
                  room.seats.length - allocatedSeats.length;
                await tx.room.update({
                  where: { id: booking.roomId },
                  data: {
                    claimed: { decrement: allocatedSeats.length },
                    // Clear branchAllocated if no more students are allocated
                    branchAllocated:
                      remainingAllocatedCount === 0
                        ? null
                        : room.branchAllocated,
                  },
                });
              }
            });

            console.log(
              `Deallocated ${allocatedSeats.length} students from room ${booking.roomId} after booking expiration`
            );
          }
        } catch (deallocationError) {
          console.error(
            `Failed to deallocate students for expired booking ${booking.id}:`,
            deallocationError
          );
          // Continue with booking status update even if deallocation fails
        }

        await prisma.roomBooking.update({
          where: { id: booking.id },
          data: { status: "Completed" },
        });

        console.log(
          `Booking ${booking.id} expired and marked as Completed for room ${booking.room.name}`
        );

        // Emit real-time event
        if (this.io) {
          this.io.emit("bookingExpired", {
            bookingId: booking.id,
            roomId: booking.roomId,
            booking: {
              ...booking,
              status: "Completed",
            },
          });
        }
      }

      if (startedBookings.length > 0 || expiredBookings.length > 0) {
        console.log(
          `Booking status update completed: ${startedBookings.length} started, ${expiredBookings.length} expired`
        );
      }
    } catch (error) {
      console.error("Error updating booking statuses:", error);
    }
  }

  /**
   * Start the scheduled job to run every 5 minutes
   */
  startScheduledJob(): NodeJS.Timeout {
    console.log("Starting booking expiration service (runs every 5 minutes)");

    // Run immediately on start
    this.updateBookingStatuses();

    // Then run every 5 minutes
    const interval = setInterval(() => {
      this.updateBookingStatuses();
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    return interval;
  }

  /**
   * Stop the scheduled job
   */
  stopScheduledJob(interval: NodeJS.Timeout): void {
    clearInterval(interval);
    console.log("Booking expiration service stopped");
  }
}
