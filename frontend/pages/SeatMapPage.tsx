import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
  Tooltip,
  Card,
  CardBody,
  Chip,
} from "@heroui/react";
import { SeatMapSkeleton } from "../components/ui";
import { useSeatPlanner } from "../context/SeatPlannerContext";
import { api, ConflictError } from "../services/apiService";
import { authService } from "../services/authService";
import {
  Seat,
  SeatStatus,
  Student,
  Room,
  Branch,
  AllocationSummary,
} from "../types";
import io from "socket.io-client";
import { ACCESSIBILITY_NEEDS } from "../constants";

const BRANCHES = [
  { id: Branch.ConsultingClub, label: "Consulting Club" },
  { id: Branch.InvestmentBankingClub, label: "Investment Banking Club" },
  { id: Branch.TechAndInnovationClub, label: "Tech & Innovation Club" },
  { id: Branch.EntrepreneurshipCell, label: "Entrepreneurship Cell" },
  { id: Branch.SustainabilityAndCSRClub, label: "Sustainability & CSR Club" },
  { id: Branch.WomenInBusiness, label: "Women in Business" },
  { id: Branch.HealthcareManagementClub, label: "Healthcare Management Club" },
  { id: Branch.RealEstateClub, label: "Real Estate Club" },
];

const STUDENT_ACCESSIBILITY_NEEDS = ACCESSIBILITY_NEEDS;

const SeatComponent: React.FC<{
  seat: Seat;
  student?: Student;
  onClick: () => void;
  isClickable: boolean;
}> = ({ seat, student, onClick, isClickable }) => {
  const isAdmin = authService.isAdmin();
  const getStatusClasses = (status: SeatStatus) => {
    switch (status) {
      case SeatStatus.Available:
        return "bg-success-100 border-success-400 hover:bg-success-200 text-success-800 dark:bg-success-900/30 dark:border-success-600";
      case SeatStatus.Allocated:
        return "bg-default-200 border-default-500 hover:bg-default-300 text-default-800 dark:bg-default-700 dark:border-default-600";
      case SeatStatus.Broken:
        return "bg-danger-200 border-danger-500 hover:bg-danger-300 text-danger-800 dark:bg-danger-900/30 dark:border-danger-600";
      default:
        return "bg-warning-100 border-warning-400 text-warning-800";
    }
  };
  const cursorClass = isClickable ? "cursor-pointer" : "cursor-default";
  const tooltipContent = useMemo(() => {
    if (seat.status === SeatStatus.Allocated) {
      return isAdmin
        ? `Allocated to: ${student?.name || "a student"}`
        : "Allocated";
    }
    if (seat.features.length > 0) {
      return `Features: ${seat.features.join(", ")}`;
    }
    return seat.label;
  }, [seat, student, isAdmin]);

  return (
    <Tooltip content={tooltipContent} delay={300}>
      <div
        onClick={isClickable ? onClick : undefined}
        className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-lg border-2 flex flex-col justify-center items-center transition-all relative ${getStatusClasses(
          seat.status
        )} ${cursorClass}`}
      >
        <span className="text-xs sm:text-sm font-bold">{seat.label}</span>
        {seat.status === SeatStatus.Allocated && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {seat.status === SeatStatus.Broken && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-danger mt-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </Tooltip>
  );
};

const SeatMapPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useSeatPlanner();
  const { seats: allSeats, students, loading } = state;
  const isAdmin = authService.isAdmin();

  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  const roomSeats = useMemo(
    () => allSeats.filter((s) => s.roomId === roomId),
    [allSeats, roomId]
  );

  const seatStats = useMemo(() => {
    const total = roomSeats.length;
    const filled = roomSeats.filter(
      (s) => s.status === SeatStatus.Allocated
    ).length;
    const broken = roomSeats.filter(
      (s) => s.status === SeatStatus.Broken
    ).length;
    const available = roomSeats.filter(
      (s) => s.status === SeatStatus.Available
    ).length;
    return { total, filled, broken, available };
  }, [roomSeats]);

  const seatColumns = useMemo(() => {
    if (!currentRoom || roomSeats.length === 0) return [];
    const actualRows =
      currentRoom.rows || Math.max(...roomSeats.map((s) => s.row)) + 1;
    const actualCols =
      currentRoom.cols || Math.max(...roomSeats.map((s) => s.col)) + 1;
    const columns: (Seat | null)[][] = Array.from({ length: actualCols }, () =>
      Array(actualRows).fill(null)
    );
    roomSeats.forEach((seat) => {
      if (seat.col < actualCols && seat.row < actualRows) {
        columns[seat.col][seat.row] = seat;
      }
    });
    return columns;
  }, [roomSeats, currentRoom]);

  const fetchData = async () => {
    if (!roomId) return;
    dispatch({ type: "API_REQUEST_START" });
    try {
      const [roomData, seatsData] = await Promise.all([
        api.getRoomById(roomId),
        api.getSeatsByRoom(roomId),
      ]);
      setCurrentRoom(roomData);
      dispatch({ type: "GET_SEATS_SUCCESS", payload: seatsData });
    } catch (err) {
      dispatch({
        type: "API_REQUEST_FAIL",
        payload: "Failed to fetch seat map.",
      });
    }
  };

  useEffect(() => {
    fetchData();

    const socketUrl = (
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"
    ).replace("/api", "");
    const socket = io(socketUrl);
    socket.on("seatUpdated", (updatedSeat: Seat) => {
      if (updatedSeat.roomId === roomId) {
        dispatch({ type: "UPDATE_SEAT_SUCCESS", payload: updatedSeat });
        setSelectedSeat((prev) =>
          prev?.id === updatedSeat.id ? updatedSeat : prev
        );
      }
    });
    socket.on("allocationsUpdated", fetchData);
    return () => {
      socket.disconnect();
    };
  }, [roomId, dispatch]);

  const handleSeatClick = (seat: Seat) => {
    if (!isAdmin) return;
    setSelectedSeat(seat);
    setModalError("");
    setIsEditModalOpen(true);
  };

  const handleUpdateStatus = async (status: SeatStatus) => {
    if (!selectedSeat || !isAdmin) return;
    setIsSubmitting(true);
    setModalError("");
    try {
      await api.updateSeatStatus(selectedSeat.id, status, selectedSeat.version);
      setIsEditModalOpen(false);
    } catch (err) {
      if (err instanceof ConflictError && err.currentData) {
        dispatch({ type: "UPDATE_SEAT_SUCCESS", payload: err.currentData });
        setSelectedSeat(err.currentData);
        setModalError(
          "This seat was just modified by another admin. Your view has been updated. Please try again."
        );
      } else {
        setModalError((err as Error).message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSeatStudent = useMemo(
    () => students.find((s) => s.id === selectedSeat?.studentId),
    [students, selectedSeat]
  );

  if (loading && roomSeats.length === 0) {
    return <SeatMapSkeleton />;
  }

  return (
    <div>
      <Button
        variant="light"
        onPress={() => navigate(`/buildings/${currentRoom?.buildingId}/rooms`)}
        className="mb-6"
      >
        ← Back to Rooms
      </Button>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Seat Map: {currentRoom?.name}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm mb-3">
            <Chip color="success" variant="flat" size="sm">
              Available
            </Chip>
            <Chip color="default" variant="flat" size="sm">
              Filled
            </Chip>
            <Chip color="danger" variant="flat" size="sm">
              Broken
            </Chip>
            {currentRoom?.branchAllocated && (
              <Chip color="primary" variant="flat">
                Allocated to:{" "}
                {
                  BRANCHES.find((b) => b.id === currentRoom.branchAllocated)
                    ?.label
                }
              </Chip>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
            <span>Total: {seatStats.total}</span>
            <span className="text-default-600">Filled: {seatStats.filled}</span>
            <span className="text-danger">Broken: {seatStats.broken}</span>
            <span className="text-success">
              Available: {seatStats.available}
            </span>
          </div>
        </div>
      </div>

      {seatColumns.length > 0 ? (
        <Card>
          <CardBody className="overflow-auto">
            <div className="flex gap-0.5 sm:gap-1 md:gap-1.5 justify-center min-w-min p-4">
              {seatColumns.map((column, colIndex) => (
                <div
                  key={colIndex}
                  className={`flex flex-col gap-0.5 sm:gap-1 md:gap-1.5 ${
                    colIndex > 0 && colIndex % 3 === 0
                      ? "ml-1 sm:ml-2 md:ml-3"
                      : ""
                  }`}
                >
                  {column.map((rowIndex, seatIndex) =>
                    column[seatIndex] ? (
                      <SeatComponent
                        key={column[seatIndex]!.id}
                        seat={column[seatIndex]!}
                        student={students.find(
                          (s) => s.id === column[seatIndex]!.studentId
                        )}
                        onClick={() => handleSeatClick(column[seatIndex]!)}
                        isClickable={isAdmin}
                      />
                    ) : (
                      <div
                        key={`empty-${colIndex}-${seatIndex}`}
                        className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14"
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : (
        <p className="text-center text-default-500 py-8">
          No seats found for this room.
        </p>
      )}

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        size="lg"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center">
                <h2 className="text-2xl font-bold">
                  Seat {selectedSeat?.label}
                </h2>
                <p className="text-sm text-default-500">Manage seat status</p>
              </ModalHeader>
              <ModalBody className="py-6">
                {selectedSeat && (
                  <div className="space-y-6">
                    {/* Current Status Card */}
                    <Card className="bg-default-50">
                      <CardBody className="text-center py-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-default-600">
                              Current Status:
                            </span>
                            <Chip
                              color={
                                selectedSeat.status === "Available"
                                  ? "success"
                                  : selectedSeat.status === "Allocated"
                                  ? "default"
                                  : "danger"
                              }
                              variant="flat"
                              size="sm"
                            >
                              {selectedSeat.status}
                            </Chip>
                          </div>
                          {selectedSeatStudent && (
                            <div className="flex items-center gap-2 mt-2">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 text-default-500"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <span className="text-sm text-default-600">
                                {selectedSeatStudent.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardBody>
                    </Card>

                    {/* Status Update Buttons */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-center">
                        Update Status
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        <Button
                          color="success"
                          variant={
                            selectedSeat.status === "Available"
                              ? "solid"
                              : "bordered"
                          }
                          onPress={() =>
                            handleUpdateStatus(SeatStatus.Available)
                          }
                          isDisabled={
                            isSubmitting || selectedSeat.status === "Available"
                          }
                          className="h-12 text-medium"
                          startContent={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          }
                        >
                          Mark as Available
                        </Button>
                        <Button
                          color="default"
                          variant={
                            selectedSeat.status === "Allocated"
                              ? "solid"
                              : "bordered"
                          }
                          onPress={() =>
                            handleUpdateStatus(SeatStatus.Allocated)
                          }
                          isDisabled={
                            isSubmitting || selectedSeat.status === "Allocated"
                          }
                          className="h-12 text-medium"
                          startContent={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                clipRule="evenodd"
                              />
                            </svg>
                          }
                        >
                          Mark as Filled
                        </Button>
                        <Button
                          color="danger"
                          variant={
                            selectedSeat.status === "Broken"
                              ? "solid"
                              : "bordered"
                          }
                          onPress={() => handleUpdateStatus(SeatStatus.Broken)}
                          isDisabled={
                            isSubmitting || selectedSeat.status === "Broken"
                          }
                          className="h-12 text-medium"
                          startContent={
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          }
                        >
                          Mark as Broken
                        </Button>
                      </div>
                    </div>

                    {modalError && (
                      <Card className="bg-danger-50 border-danger-200">
                        <CardBody className="py-3">
                          <p className="text-danger text-sm text-center">
                            {modalError}
                          </p>
                        </CardBody>
                      </Card>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter className="justify-center">
                <Button
                  color="default"
                  variant="light"
                  onPress={onClose}
                  className="px-8"
                >
                  Close
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default SeatMapPage;
