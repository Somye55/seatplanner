import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Tooltip,
  Card,
  CardBody,
  Chip,
  Divider,
} from "@heroui/react";
import { SeatMapSkeleton, LocationBreadcrumb } from "../components/ui";
import { useSeatPlanner } from "../context/SeatPlannerContext";
import { api, ConflictError } from "../services/apiService";
import { authService } from "../services/authService";
import { Seat, SeatStatus, Student, Room, Branch } from "../types";
import io from "socket.io-client";

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
        return "bg-success-100 border-success-400 hover:bg-success-200 text-success-800 dark:bg-success-900/50 dark:border-success-500 dark:text-success-300 dark:hover:bg-success-900/70";
      case SeatStatus.Allocated:
        return "bg-default-200 border-default-500 hover:bg-default-300 text-default-800 dark:bg-default-700/80 dark:border-default-500 dark:text-default-300 dark:hover:bg-default-700";
      case SeatStatus.Broken:
        return "bg-danger-200 border-danger-500 hover:bg-danger-300 text-danger-800 dark:bg-danger-900/50 dark:border-danger-500 dark:text-danger-300 dark:hover:bg-danger-900/70";
      default:
        return "bg-warning-100 border-warning-400 text-warning-800 dark:bg-warning-900/50 dark:border-warning-500 dark:text-warning-300";
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
  const [initialLoad, setInitialLoad] = useState(true);

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
      setInitialLoad(false);
    } catch (err) {
      dispatch({
        type: "API_REQUEST_FAIL",
        payload: "Failed to fetch seat map.",
      });
      setInitialLoad(false);
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

  if (initialLoad || (loading && roomSeats.length === 0)) {
    return <SeatMapSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-default-50/30 dark:from-background dark:via-background dark:to-default-100/10">
      {/* Navigation Header */}
      <Button
        variant="light"
        onPress={() => navigate(`/buildings/${currentRoom?.buildingId}/rooms`)}
        className="mb-6"
      >
        ← Back to Rooms
      </Button>

      {currentRoom && (
        <LocationBreadcrumb
          levels={[
            ...(currentRoom.building?.block
              ? [
                  {
                    type: "block" as const,
                    name: currentRoom.building.block.name,
                    code: currentRoom.building.block.code,
                    link: "/blocks",
                  },
                ]
              : []),
            ...(currentRoom.building
              ? [
                  {
                    type: "building" as const,
                    name: currentRoom.building.name,
                    code: currentRoom.building.code,
                    link: `/buildings/${currentRoom.buildingId}/rooms`,
                  },
                ]
              : []),
            ...(currentRoom.floor
              ? [
                  {
                    type: "floor" as const,
                    name: currentRoom.floor.name,
                    code: `Floor ${currentRoom.floor.number}`,
                  },
                ]
              : []),
            {
              type: "room" as const,
              name: currentRoom.name,
            },
          ]}
          className="mb-6"
        />
      )}

      <div className="max-w-7xl mx-auto px-4 pb-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-default-50 to-white dark:from-[#1a1a1a] dark:to-[#0f0f0f] shadow-sm hover:shadow-md transition-shadow border border-default-200/50 dark:border-default-800/40">
            <CardBody className="text-center py-6">
              <div className="text-2xl font-bold text-default-700 dark:text-default-100 mb-1">
                {seatStats.total}
              </div>
              <div className="text-sm text-default-500 dark:text-default-400 font-medium">
                Total Seats
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-success-50 to-white dark:from-[#1a1a1a] dark:to-[#0f0f0f] shadow-sm hover:shadow-md transition-shadow border border-success-200/50 dark:border-default-800/40">
            <CardBody className="text-center py-6">
              <div className="text-2xl font-bold text-success-600 dark:text-success-400 mb-1">
                {seatStats.available}
              </div>
              <div className="text-sm text-success-600 dark:text-success-400 font-medium">
                Available
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-primary-50 to-white dark:from-[#1a1a1a] dark:to-[#0f0f0f] shadow-sm hover:shadow-md transition-shadow border border-primary-200/50 dark:border-default-800/40">
            <CardBody className="text-center py-6">
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-1">
                {seatStats.filled}
              </div>
              <div className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                Occupied
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-danger-50 to-white dark:from-[#1a1a1a] dark:to-[#0f0f0f] shadow-sm hover:shadow-md transition-shadow border border-danger-200/50 dark:border-default-800/40">
            <CardBody className="text-center py-6">
              <div className="text-2xl font-bold text-danger-600 dark:text-danger-400 mb-1">
                {seatStats.broken}
              </div>
              <div className="text-sm text-danger-600 dark:text-danger-400 font-medium">
                Out of Order
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Legend and Branch Info */}
        <Card className="mb-8 bg-gradient-to-r from-white to-default-50/50 dark:from-[#1a1a1a] dark:to-[#0f0f0f] shadow-sm border border-default-200/50 dark:border-default-800/40">
          <CardBody className="py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Legend */}
              <div>
                <h3 className="text-lg font-semibold mb-3 text-default-700 dark:text-default-200">
                  Legend
                </h3>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-success-200 dark:bg-success-900/50 border-2 border-success-400 dark:border-success-500 rounded"></div>
                    <span className="text-sm font-medium text-success-700 dark:text-success-300">
                      Available
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-default-200 dark:bg-default-700/80 border-2 border-default-500 dark:border-default-500 rounded"></div>
                    <span className="text-sm font-medium text-default-600 dark:text-default-300">
                      Occupied
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-danger-200 dark:bg-danger-900/50 border-2 border-danger-500 dark:border-danger-500 rounded"></div>
                    <span className="text-sm font-medium text-danger-700 dark:text-danger-300">
                      Out of Order
                    </span>
                  </div>
                </div>
              </div>

              {/* Branch Allocation */}
              {currentRoom?.branchAllocated && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-default-700 dark:text-default-200">
                    Room Assignment
                  </h3>
                  <Chip
                    color="primary"
                    variant="flat"
                    size="lg"
                    startContent={
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    }
                  >
                    {
                      BRANCHES.find((b) => b.id === currentRoom.branchAllocated)
                        ?.label
                    }
                  </Chip>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Seat Map */}
        <div className="px-4">
          {seatColumns.length > 0 ? (
            <Card className="bg-gradient-to-br from-white via-white to-default-50/30 dark:from-[#1a1a1a] dark:via-[#171717] dark:to-[#0f0f0f] shadow-lg border-0 dark:border dark:border-default-800/40">
              <CardBody className="p-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-default-700 dark:text-default-200 mb-2">
                    Room Layout
                  </h2>
                  <div className="w-24 h-1 bg-gradient-to-r from-primary-400 to-secondary-400 dark:from-primary-600 dark:to-secondary-600 rounded-full mx-auto"></div>
                </div>

                <div className="overflow-auto bg-gradient-to-br from-default-50/50 to-white dark:from-[#0a0a0a] dark:to-[#050505] rounded-2xl p-6 border border-default-200/50 dark:border-default-800/30">
                  <div className="flex gap-0.5 sm:gap-1 md:gap-1.5 justify-center min-w-min">
                    {seatColumns.map((column, colIndex) => (
                      <div
                        key={colIndex}
                        className={`flex flex-col gap-0.5 sm:gap-1 md:gap-1.5 ${
                          colIndex > 0 && colIndex % 3 === 0
                            ? "ml-1 sm:ml-2 md:ml-3"
                            : ""
                        }`}
                      >
                        {column.map((_, seatIndex) =>
                          column[seatIndex] ? (
                            <SeatComponent
                              key={column[seatIndex]!.id}
                              seat={column[seatIndex]!}
                              student={students.find(
                                (s) => s.id === column[seatIndex]!.studentId
                              )}
                              onClick={() =>
                                handleSeatClick(column[seatIndex]!)
                              }
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
                </div>

                {isAdmin && (
                  <div className="mt-6 text-center">
                    <p className="text-sm text-default-500 dark:text-default-400">
                      💡 Click on any seat to manage its status
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          ) : (
            <Card className="bg-gradient-to-br from-default-50 to-white dark:from-[#1a1a1a] dark:to-[#0f0f0f] shadow-sm border border-default-200/50 dark:border-default-800/40">
              <CardBody className="text-center py-16">
                <div className="mb-4">
                  <svg
                    className="w-16 h-16 text-default-300 dark:text-default-600 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-default-600 dark:text-default-400 mb-2">
                  No Seats Available
                </h3>
                <p className="text-default-500 dark:text-default-500">
                  This room doesn't have any seats configured yet.
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Enhanced Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        size="2xl"
        backdrop="blur"
        hideCloseButton={true}
        classNames={{
          base: "bg-gradient-to-br from-white to-default-50 dark:from-default-900 dark:to-default-950",
          backdrop: "bg-black/50 backdrop-blur-sm",
        }}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-center pb-2 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-950/50 dark:to-secondary-950/50 rounded-t-lg">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-lg">
                    <svg
                      className="w-6 h-6 text-primary-600 dark:text-primary-400"
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
                  </div>
                  <h2 className="text-2xl font-bold text-default-800 dark:text-default-200">
                    Seat {selectedSeat?.label}
                  </h2>
                </div>
                <p className="text-sm text-default-600 dark:text-default-400">
                  Manage seat status and allocation
                </p>
              </ModalHeader>

              <ModalBody className="py-8 px-8">
                {selectedSeat && (
                  <div className="space-y-8">
                    {/* Current Status Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-default-700 dark:text-default-300">
                        Current Status
                      </h3>
                      <Card className="bg-gradient-to-r from-default-50 to-white dark:from-default-900/60 dark:to-default-950/50 border border-default-200 dark:border-default-700">
                        <CardBody className="py-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${
                                  selectedSeat.status === "Available"
                                    ? "bg-success-100 dark:bg-success-900/30 border-success-300 dark:border-success-600 text-success-600 dark:text-success-400"
                                    : selectedSeat.status === "Allocated"
                                    ? "bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600 text-primary-600 dark:text-primary-400"
                                    : "bg-danger-100 dark:bg-danger-900/30 border-danger-300 dark:border-danger-600 text-danger-600 dark:text-danger-400"
                                }`}
                              >
                                {selectedSeat.status === "Available" && (
                                  <svg
                                    className="w-6 h-6"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                                {selectedSeat.status === "Allocated" && (
                                  <svg
                                    className="w-6 h-6"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                                {selectedSeat.status === "Broken" && (
                                  <svg
                                    className="w-6 h-6"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <Chip
                                  color={
                                    selectedSeat.status === "Available"
                                      ? "success"
                                      : selectedSeat.status === "Allocated"
                                      ? "primary"
                                      : "danger"
                                  }
                                  variant="flat"
                                  size="lg"
                                  className="font-semibold"
                                >
                                  {selectedSeat.status}
                                </Chip>
                                {selectedSeatStudent && (
                                  <p className="text-sm text-default-600 dark:text-default-400 mt-2 flex items-center gap-2">
                                    <svg
                                      className="w-4 h-4"
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    {selectedSeatStudent.name}
                                  </p>
                                )}
                              </div>
                            </div>

                            {selectedSeat.features.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {selectedSeat.features.map((feature) => (
                                  <Chip
                                    key={feature}
                                    size="sm"
                                    variant="bordered"
                                    className="text-xs"
                                  >
                                    {feature}
                                  </Chip>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardBody>
                      </Card>
                    </div>

                    <Divider />

                    {/* Status Update Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-default-700 dark:text-default-300">
                        Update Status
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
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
                          className="h-14 text-medium justify-start"
                          startContent={
                            <div className="w-8 h-8 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center">
                              <svg
                                className="h-5 w-5 text-success-600 dark:text-success-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          }
                        >
                          <div className="text-left">
                            <div className="font-semibold">
                              Mark as Available
                            </div>
                            <div className="text-xs opacity-70">
                              Ready for new allocation
                            </div>
                          </div>
                        </Button>

                        <Button
                          color="primary"
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
                          className="h-14 text-medium justify-start"
                          startContent={
                            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                              <svg
                                className="h-5 w-5 text-primary-600 dark:text-primary-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          }
                        >
                          <div className="text-left">
                            <div className="font-semibold">
                              Mark as Occupied
                            </div>
                            <div className="text-xs opacity-70">
                              Currently in use
                            </div>
                          </div>
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
                          className="h-14 text-medium justify-start"
                          startContent={
                            <div className="w-8 h-8 bg-danger-100 dark:bg-danger-900/30 rounded-lg flex items-center justify-center">
                              <svg
                                className="h-5 w-5 text-danger-600 dark:text-danger-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          }
                        >
                          <div className="text-left">
                            <div className="font-semibold">
                              Mark as Out of Order
                            </div>
                            <div className="text-xs opacity-70">
                              Needs maintenance
                            </div>
                          </div>
                        </Button>
                      </div>
                    </div>

                    {modalError && (
                      <Card className="bg-gradient-to-r from-danger-50 to-danger-100/50 dark:from-danger-950/50 dark:to-danger-950/40 border border-danger-200 dark:border-danger-800">
                        <CardBody className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-danger-100 dark:bg-danger-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-5 h-5 text-danger-600 dark:text-danger-400"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <p className="text-danger-700 dark:text-danger-400 text-sm font-medium">
                              {modalError}
                            </p>
                          </div>
                        </CardBody>
                      </Card>
                    )}
                  </div>
                )}
              </ModalBody>

              <ModalFooter className="justify-center pt-4 pb-6">
                <Button
                  color="default"
                  variant="light"
                  onPress={onClose}
                  className="px-8 h-12"
                  startContent={
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  }
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
