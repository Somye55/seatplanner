import { useEffect } from "react";
import io, { Socket } from "socket.io-client";

interface BookingCreatedEvent {
  id: string;
  roomId: string;
  teacherId: string;
  branch: string;
  capacity: number;
  startTime: string;
  endTime: string;
  status: string;
  room: any;
  teacher: any;
}

interface BookingStatusChangedEvent {
  bookingId: string;
  roomId: string;
  status: "NotStarted" | "Ongoing" | "Completed";
  booking: any;
}

interface BookingExpiredEvent {
  bookingId: string;
  roomId: string;
  booking: any;
}

interface BookingCanceledEvent {
  bookingId: string;
  roomId: string;
}

interface BookingConflictEvent {
  roomId: string;
  startTime: string;
  endTime: string;
  userId: string;
  conflictingBooking?: {
    id: string;
    teacherName: string;
    startTime: string;
    endTime: string;
  };
  message: string;
}

interface BookingUpdateCallbacks {
  onBookingCreated?: (event: BookingCreatedEvent) => void;
  onBookingStatusChanged?: (event: BookingStatusChangedEvent) => void;
  onBookingExpired?: (event: BookingExpiredEvent) => void;
  onBookingCanceled?: (event: BookingCanceledEvent) => void;
  onBookingConflict?: (event: BookingConflictEvent) => void;
}

/**
 * Custom hook to listen for real-time booking updates via Socket.io
 *
 * @param callbacks - Object containing callback functions for different booking events
 * @returns void
 *
 * @example
 * ```tsx
 * useBookingUpdates({
 *   onBookingCreated: (event) => {
 *     console.log('New booking created:', event);
 *     refreshBookings();
 *   },
 *   onBookingStatusChanged: (event) => {
 *     console.log('Booking status changed:', event);
 *     updateBookingInList(event.bookingId, event.status);
 *   },
 *   onBookingExpired: (event) => {
 *     console.log('Booking expired:', event);
 *     removeBookingFromList(event.bookingId);
 *   },
 *   onBookingCanceled: (event) => {
 *     console.log('Booking canceled:', event);
 *     removeBookingFromList(event.bookingId);
 *   },
 *   onBookingConflict: (event) => {
 *     console.log('Booking conflict:', event);
 *     showErrorToast(event.message);
 *   }
 * });
 * ```
 */
export const useBookingUpdates = (callbacks: BookingUpdateCallbacks): void => {
  useEffect(() => {
    // Get the Socket.io server URL from the API base URL
    const socketUrl = (
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"
    ).replace("/api", "");

    // Create Socket.io connection
    const socket: Socket = io(socketUrl);

    // Set up event listeners
    if (callbacks.onBookingCreated) {
      socket.on("bookingCreated", callbacks.onBookingCreated);
    }

    if (callbacks.onBookingStatusChanged) {
      socket.on("bookingStatusChanged", callbacks.onBookingStatusChanged);
    }

    if (callbacks.onBookingExpired) {
      socket.on("bookingExpired", callbacks.onBookingExpired);
    }

    if (callbacks.onBookingCanceled) {
      socket.on("bookingCanceled", callbacks.onBookingCanceled);
    }

    if (callbacks.onBookingConflict) {
      socket.on("bookingConflict", callbacks.onBookingConflict);
    }

    // Cleanup function to disconnect socket and remove listeners
    return () => {
      socket.disconnect();
    };
  }, [
    callbacks.onBookingCreated,
    callbacks.onBookingStatusChanged,
    callbacks.onBookingExpired,
    callbacks.onBookingCanceled,
    callbacks.onBookingConflict,
  ]);
};
