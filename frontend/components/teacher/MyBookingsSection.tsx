import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Divider,
  Skeleton,
} from "@heroui/react";
import { api } from "../../services/apiService";
import { RoomBooking } from "../../types";
import { authService } from "../../services/authService";
import BookingStatusBadge from "./BookingStatusBadge";
import { ConfirmationModal, BookingSkeleton } from "../ui";
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
  const [refreshing, setRefreshing] = useState(false);
  const [cancelError, setCancelError] = useState<string>("");
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

  const loadBookings = async (isRefresh = false) => {
    if (!user) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
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
      setRefreshing(false);
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
    return <BookingSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-danger shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">My Bookings</h2>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="pt-4">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-danger-50 mb-4">
              <svg
                className="w-8 h-8 text-danger"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-danger font-medium">{error}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="flex justify-between items-center pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">My Bookings</h2>
          </div>
          <Button
            size="sm"
            variant="light"
            onPress={() => loadBookings(true)}
            isLoading={refreshing}
            startContent={
              !refreshing && (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )
            }
          >
            Refresh
          </Button>
        </CardHeader>
        <Divider />
        <CardBody className="pt-4">
          {cancelError && (
            <div className="mb-4 bg-danger-50 border border-danger p-3 rounded-lg">
              <p className="text-danger text-sm">{cancelError}</p>
            </div>
          )}

          {refreshing ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="border border-divider rounded-xl p-5 bg-gradient-to-br from-default-50 to-default-100/50"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <Skeleton className="rounded-lg flex-shrink-0 mt-0.5">
                          <div className="w-10 h-10 rounded-lg bg-default-200"></div>
                        </Skeleton>
                        <div className="flex-1 min-w-0">
                          <Skeleton className="rounded-lg">
                            <div className="h-[1.75rem] w-48 rounded-lg bg-default-200"></div>
                          </Skeleton>
                          <Skeleton className="rounded-lg mt-0.5">
                            <div className="h-5 w-64 rounded-lg bg-default-200"></div>
                          </Skeleton>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <Skeleton className="rounded-md">
                              <div className="h-6 w-16 rounded-md bg-default-200"></div>
                            </Skeleton>
                            <Skeleton className="rounded-md">
                              <div className="h-6 w-20 rounded-md bg-default-200"></div>
                            </Skeleton>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Skeleton className="rounded-full">
                        <div className="h-6 w-20 rounded-full bg-default-200"></div>
                      </Skeleton>
                      <div className="space-y-1">
                        <Skeleton className="rounded-lg">
                          <div className="h-3 w-28 rounded-lg bg-default-200"></div>
                        </Skeleton>
                        <Skeleton className="rounded-lg">
                          <div className="h-3 w-28 rounded-lg bg-default-200"></div>
                        </Skeleton>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-default-100 mb-4">
                <svg
                  className="w-8 h-8 text-default-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-default-600 text-lg font-medium">
                No bookings yet
              </p>
              <p className="text-default-400 text-sm mt-1">
                Search for a room to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="border border-divider rounded-xl p-5 hover:shadow-md hover:border-primary/30 transition-all duration-200 bg-gradient-to-br from-default-50 to-default-100/50 dark:from-default-100/5 dark:to-default-100/10"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                          <svg
                            className="w-5 h-5 text-primary"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg text-default-900 truncate">
                            {booking.room?.name || "Room"}
                          </h3>
                          {booking.room && (
                            <p className="text-sm text-default-500 mt-0.5 flex items-center gap-1.5">
                              <svg
                                className="w-4 h-4 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span className="truncate">
                                {booking.room.building?.name} •{" "}
                                {booking.room.floor?.name}
                              </span>
                            </p>
                          )}
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 bg-default-100 dark:bg-default-200/10 px-2.5 py-1 rounded-md text-xs font-medium text-default-700">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                              {booking.capacity}
                            </span>
                            <span className="inline-flex items-center gap-1.5 bg-default-100 dark:bg-default-200/10 px-2.5 py-1 rounded-md text-xs font-medium text-default-700">
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                              </svg>
                              {booking.branch}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2.5 flex-shrink-0">
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
                          className="min-w-[70px]"
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
