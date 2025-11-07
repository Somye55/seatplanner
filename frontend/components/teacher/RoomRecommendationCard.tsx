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
                {room.building.block.name}
              </span>
              <span>→</span>
              <span className="bg-default-100 px-2 py-1 rounded">
                {room.building.name}
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
        size="md"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Confirm Room Booking</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <p className="text-default-600">
                    You are about to book the following room:
                  </p>

                  <div className="bg-default-100 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Room:</span>
                      <span>{room.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Capacity:</span>
                      <span>{room.capacity} students</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Location:</span>
                      <span className="text-sm">
                        {room.building.block.name} → {room.building.name} →{" "}
                        {room.floor.name}
                      </span>
                    </div>
                  </div>

                  {bookingError && (
                    <div className="bg-danger-50 border border-danger p-3 rounded-lg">
                      <p className="text-danger text-sm">{bookingError}</p>
                    </div>
                  )}

                  <p className="text-sm text-default-500">
                    Once confirmed, this room will be reserved for your
                    specified time period.
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="default"
                  variant="light"
                  onPress={onClose}
                  isDisabled={isBooking}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleConfirmBooking}
                  isLoading={isBooking}
                >
                  Confirm Booking
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
