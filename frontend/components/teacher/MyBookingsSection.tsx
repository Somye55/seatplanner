import React, { useState, useEffect } from "react";
import { Card, CardBody, CardHeader, Button, Divider } from "@heroui/react";
import { api } from "../../services/apiService";
import { RoomBooking } from "../../types";
import { authService } from "../../services/authService";
import BookingStatusBadge from "./BookingStatusBadge";
import { Spinner, ConfirmationModal } from "../ui";
import { useBookingUpdates } from "../../hooks/useBookingUpdates";
import { useSeatPlanner } from "../../context/SeatPlannerContext";
import { showErrorToast, showSuccessToast } from "../../utils/toast";

interface MyBookingsSectionProps {
  refreshTrigger: number;
}

const MyBookingsSection: React.FC<MyBookingsSectionProps> = ({
  refreshTrigger,
}) => {
  const { state, dispatch } = useSeatPlanner();
  const { bookings } = state;
  const [loading, setLoading] = useState(true);
  const [cancelError, setCancelError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<RoomBooking | null>(
    null
  );

  const user = authService.getUser();

  // Use the booking updates hook for real-time updates
  useBookingUpdates({
    onBookingCreated: (event) => {
      // Add new booking to context
      dispatch({ type: "ADD_BOOKING_SUCCESS", payload: event as RoomBooking });
    },
    onBookingStatusChanged: (event) => {
      // Update booking status in context
      if (event.booking) {
        dispatch({ type: "UPDATE_BOOKING_SUCCESS", payload: event.booking });
      } else {
        // If full booking not provided, reload bookings
        loadBookings();
      }
    },
    onBookingExpired: (event) => {
      // Update booking to completed status in context
      if (event.booking) {
        dispatch({ type: "UPDATE_BOOKING_SUCCESS", payload: event.booking });
      } else {
        // If full booking not provided, reload bookings
        loadBookings();
      }
    },
    onBookingCanceled: (event) => {
      // Remove booking from context
      dispatch({ type: "DELETE_BOOKING_SUCCESS", payload: event.bookingId });
    },
  });

  const loadBookings = async () => {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      // For teachers, we need to get their teacher ID first
      // This is a simplified version - in production, you'd have a proper way to get teacher ID
      const allBookings = await api.getBookings();

      // Update context with bookings
      dispatch({ type: "GET_BOOKINGS_SUCCESS", payload: allBookings });
    } catch (err) {
      const errorMsg = (err as Error).message;
      setError(errorMsg);
      showErrorToast(err, "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [refreshTrigger]);

  const handleCancelClick = (booking: RoomBooking) => {
    setBookingToCancel(booking);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;

    setCancellingId(bookingToCancel.id);
    setCancelError("");

    try {
      await api.cancelBooking(bookingToCancel.id);
      showSuccessToast("Booking cancelled successfully");
      setBookingToCancel(null);
      loadBookings();
    } catch (err) {
      const errorMsg = (err as Error).message;
      setCancelError(errorMsg);
      showErrorToast(err, "Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  const canCancelBooking = (booking: RoomBooking): boolean => {
    // Can only cancel NotStarted bookings
    const now = new Date();
    const start = new Date(booking.startTime);
    return now < start;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">My Bookings</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-danger">
        <CardHeader>
          <h2 className="text-xl font-semibold">My Bookings</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          <p className="text-danger text-center">{error}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">My Bookings</h2>
          <Button
            size="sm"
            variant="light"
            onPress={loadBookings}
            isLoading={loading}
          >
            Refresh
          </Button>
        </CardHeader>
        <Divider />
        <CardBody>
          {successMessage && (
            <div className="mb-4 bg-success-50 border border-success p-3 rounded-lg">
              <p className="text-success text-sm">{successMessage}</p>
            </div>
          )}

          {cancelError && (
            <div className="mb-4 bg-danger-50 border border-danger p-3 rounded-lg">
              <p className="text-danger text-sm">{cancelError}</p>
            </div>
          )}

          {bookings.length === 0 ? (
            <p className="text-default-600 text-center py-8">
              You don't have any bookings yet. Search for a room to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="border border-divider rounded-lg p-4 hover:bg-default-50 dark:hover:bg-default-100/10 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {booking.room?.name || "Room"}
                      </h3>
                      {booking.room && (
                        <p className="text-sm text-default-500 mt-1">
                          {booking.room.building?.name} -{" "}
                          {booking.room.floor?.name}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-sm">
                        <span className="bg-default-100 px-2 py-1 rounded">
                          Capacity: {booking.capacity}
                        </span>
                        <span className="bg-default-100 px-2 py-1 rounded">
                          Branch: {booking.branch}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <BookingStatusBadge
                        status={booking.status}
                        startTime={booking.startTime}
                        endTime={booking.endTime}
                      />

                      {canCancelBooking(booking) && (
                        <Button
                          size="sm"
                          color="danger"
                          variant="flat"
                          onPress={() => handleCancelClick(booking)}
                          isLoading={cancellingId === booking.id}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!bookingToCancel}
        onClose={() => setBookingToCancel(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Booking"
        message={`Are you sure you want to cancel the booking for ${bookingToCancel?.room?.name}?`}
        confirmText="Cancel Booking"
        cancelText="Keep Booking"
        isLoading={!!cancellingId}
        variant="danger"
      />
    </>
  );
};

export default MyBookingsSection;
