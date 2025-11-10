import React, { useState } from "react";
import {
  Card,
  CardBody,
  CardFooter,
  Button,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Divider,
} from "@heroui/react";
import { RoomRecommendation, SearchCriteria } from "../../types";
import { api } from "../../services/apiService";
import { showErrorToast, showSuccessToast } from "../../utils/toast";

// Helper function to format time
const formatTime = (time: string) => {
  const date = new Date(time);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (time: string) => {
  const date = new Date(time);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface RoomRecommendationCardProps {
  recommendation: RoomRecommendation;
  searchCriteria: SearchCriteria;
  onBookingCreated: () => void;
}

const RoomRecommendationCard: React.FC<RoomRecommendationCardProps> = ({
  recommendation,
  searchCriteria,
  onBookingCreated,
}) => {
  const { room, distance, score } = recommendation;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string>("");

  // Get score color based on value
  const getScoreColor = (score: number): "success" | "warning" | "default" => {
    if (score >= 80) return "success";
    if (score >= 60) return "warning";
    return "default";
  };

  const handleClaimRoom = () => {
    setIsModalOpen(true);
  };

  const handleConfirmBooking = async () => {
    setIsBooking(true);
    setBookingError("");

    try {
      await api.createBooking({
        roomId: room.id,
        branch: searchCriteria.branch,
        capacity: searchCriteria.capacity,
        startTime: searchCriteria.startTime,
        endTime: searchCriteria.endTime,
      });

      setIsModalOpen(false);
      showSuccessToast(
        "Room booked successfully",
        `${room.name} has been reserved`
      );
      onBookingCreated();
    } catch (error) {
      const errorMsg = (error as Error).message;
      setBookingError(errorMsg);
      showErrorToast(error, "Failed to book room");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardBody className="gap-3">
          {/* Room Name and Score */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">{room.name}</h3>
              <p className="text-sm text-default-500">
                Capacity: {room.capacity} students
              </p>
            </div>
            <Chip color={getScoreColor(score)} variant="flat" size="sm">
              Score: {score}
            </Chip>
          </div>

          <Divider />

          {/* Location Hierarchy */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-default-600">Location:</p>
            <div className="flex flex-wrap gap-1 text-xs text-default-500">
              <span className="bg-default-100 px-2 py-1 rounded">
                {room.floor.building.block.name}
              </span>
              <span>→</span>
              <span className="bg-default-100 px-2 py-1 rounded">
                {room.floor.building.name}
              </span>
              <span>→</span>
              <span className="bg-default-100 px-2 py-1 rounded">
                {room.floor.name}
              </span>
            </div>
          </div>

          {/* Distance */}
          <div className="flex items-center justify-between bg-default-50 dark:bg-default-100/10 p-3 rounded-lg">
            <span className="text-sm font-medium">Distance:</span>
            <span className="text-sm text-default-600">
              {distance === 0
                ? "Same location"
                : `${distance.toFixed(1)} units`}
            </span>
          </div>

          {/* Room Layout */}
          <div className="text-xs text-default-500">
            Layout: {room.rows} × {room.cols} seats
          </div>
        </CardBody>

        <CardFooter className="border-t border-divider">
          <Button color="primary" className="w-full" onPress={handleClaimRoom}>
            Claim Room
          </Button>
        </CardFooter>
      </Card>

      {/* Booking Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-bold">Confirm Room Booking</h2>
                <p className="text-sm font-normal text-default-500">
                  Review your booking details before confirming
                </p>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-5">
                  {/* Room Information Card */}
                  <div className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 p-5 rounded-xl border border-primary-100 dark:border-primary-800">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-primary-700 dark:text-primary-400">
                          {room.name}
                        </h3>
                        <p className="text-sm text-default-600 mt-1">
                          {room.floor.building.block.name} →{" "}
                          {room.floor.building.name} → {room.floor.name}
                        </p>
                      </div>
                      <Chip
                        color="primary"
                        variant="flat"
                        size="lg"
                        className="font-semibold"
                      >
                        {room.capacity} seats
                      </Chip>
                    </div>

                    <Divider className="my-3" />

                    {/* Time Period */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-primary-600 dark:text-primary-400"
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
                        <div>
                          <p className="text-xs text-default-500 font-medium">
                            Date
                          </p>
                          <p className="text-sm font-semibold">
                            {formatDate(searchCriteria.startTime)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-secondary-100 dark:bg-secondary-900/30 flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-secondary-600 dark:text-secondary-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-default-500 font-medium">
                            Time Period
                          </p>
                          <p className="text-sm font-semibold">
                            {formatTime(searchCriteria.startTime)} -{" "}
                            {formatTime(searchCriteria.endTime)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-success-600 dark:text-success-400"
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
                        <div>
                          <p className="text-xs text-default-500 font-medium">
                            Branch
                          </p>
                          <p className="text-sm font-semibold">
                            {searchCriteria.branch}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {bookingError && (
                    <div className="bg-danger-50 dark:bg-danger-900/20 border-l-4 border-danger p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-5 h-5 text-danger flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div>
                          <p className="text-danger font-semibold text-sm">
                            Booking Failed
                          </p>
                          <p className="text-danger text-sm mt-1">
                            {bookingError}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info Message */}
                  <div className="bg-default-100 dark:bg-default-50/10 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-sm text-default-600">
                        Once confirmed, this room will be reserved exclusively
                        for you during the specified time period. You can manage
                        your bookings from the dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter className="gap-2">
                <Button
                  color="default"
                  variant="flat"
                  onPress={onClose}
                  isDisabled={isBooking}
                  size="lg"
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleConfirmBooking}
                  isLoading={isBooking}
                  size="lg"
                  className="font-semibold"
                >
                  {isBooking ? "Booking..." : "Confirm Booking"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default RoomRecommendationCard;
