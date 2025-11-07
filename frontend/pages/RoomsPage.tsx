import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  CardFooter,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
  Skeleton,
  Tooltip,
  Chip,
} from "@heroui/react";
import { SkeletonCard, ConfirmationModal } from "../components/ui";
import { useSeatPlanner } from "../context/SeatPlannerContext";
import { api, ConflictError } from "../services/apiService";
import { authService } from "../services/authService";
import {
  Room,
  Seat,
  Branch,
  AllocationSummary,
  BRANCH_OPTIONS,
  Floor,
} from "../types";
import io from "socket.io-client";

const BookedIcon: React.FC = () => (
  <div className="absolute top-2 right-2 bg-success text-white rounded-full p-1.5 shadow-lg">
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
  </div>
);

const AllocationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  buildingId: string | undefined;
  roomId: string;
  roomBranchAllocated: Branch | null;
  onAllocationComplete: () => void;
}> = ({
  isOpen,
  onClose,
  buildingId,
  roomId,
  roomBranchAllocated,
  onAllocationComplete,
}) => {
  const [eligibleBranches, setEligibleBranches] = useState<
    { id: Branch; label: string }[]
  >([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AllocationSummary | null>(null);
  const isReallocation = !!roomBranchAllocated;

  useEffect(() => {
    if (isOpen && roomId) {
      setLoading(true);
      setError("");
      setResult(null);
      api
        .getEligibleBranches(undefined, roomId)
        .then((branches) => {
          const branchOptions = branches.map((branchId) => ({
            id: branchId,
            label:
              BRANCH_OPTIONS.find((b) => b.id === branchId)?.label || branchId,
          }));
          setEligibleBranches(branchOptions);
          if (branchOptions.length > 0) {
            setSelectedBranch(branchOptions[0].id);
          } else {
            setSelectedBranch("");
          }
        })
        .catch(() => setError("Failed to load eligible branches."))
        .finally(() => setLoading(false));
    }
  }, [isOpen, roomId]);

  const handleAllocate = async () => {
    if (!selectedBranch) {
      setError("No branch selected.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await api.allocateBranchToRoom(selectedBranch, roomId);
      setResult(response.summary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setResult(null);
    setError("");
    onClose();
    if (result) {
      onAllocationComplete();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} size="2xl">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>
              {isReallocation
                ? "Allocate Seats to Students"
                : "Allocate Branch to Room"}
            </ModalHeader>
            <ModalBody>
              {!result ? (
                <div className="space-y-4">
                  <p className="text-sm text-default-600">
                    {isReallocation
                      ? `Allocate seats to unallocated students from ${
                          BRANCH_OPTIONS.find(
                            (b) => b.id === roomBranchAllocated
                          )?.label || roomBranchAllocated
                        } in this room.`
                      : "Select a branch to allocate all of its unallocated students to available seats within this room."}
                  </p>
                  {!isReallocation && (
                    <Select
                      label="Club / Branch"
                      variant="bordered"
                      selectedKeys={selectedBranch ? [selectedBranch] : []}
                      onChange={(e) =>
                        setSelectedBranch(e.target.value as Branch)
                      }
                      isDisabled={loading || eligibleBranches.length === 0}
                    >
                      {eligibleBranches.map((b) => (
                        <SelectItem key={b.id}>{b.label}</SelectItem>
                      ))}
                    </Select>
                  )}
                  {isReallocation && (
                    <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg">
                      <p className="text-sm">
                        <span className="font-semibold">Branch:</span>{" "}
                        {BRANCH_OPTIONS.find(
                          (b) => b.id === roomBranchAllocated
                        )?.label || roomBranchAllocated}
                      </p>
                      <p className="text-xs text-default-600 mt-2">
                        This room is already allocated to this branch. Only
                        unallocated students from this branch will be assigned
                        seats.
                      </p>
                    </div>
                  )}
                  {error && <p className="text-danger text-sm">{error}</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-success">
                    Allocation Complete!
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardBody className="text-center">
                        <p className="text-3xl font-bold text-success">
                          {result.allocatedCount}
                        </p>
                        <p className="text-sm text-default-600 mt-1">
                          Students Allocated
                        </p>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody className="text-center">
                        <p className="text-3xl font-bold text-danger">
                          {result.unallocatedCount}
                        </p>
                        <p className="text-sm text-default-600 mt-1">
                          Students Unallocated
                        </p>
                      </CardBody>
                    </Card>
                    {result.availableSeatsAfterAllocation !== undefined && (
                      <Card>
                        <CardBody className="text-center">
                          <p className="text-3xl font-bold text-secondary">
                            {result.availableSeatsAfterAllocation}
                          </p>
                          <p className="text-sm text-default-600 mt-1">
                            Available Seats
                          </p>
                        </CardBody>
                      </Card>
                    )}
                    {result.branchAllocated && (
                      <Card>
                        <CardBody className="text-center">
                          <p className="text-lg font-bold text-primary mt-2">
                            {BRANCH_OPTIONS.find(
                              (b) => b.id === result.branchAllocated
                            )?.label || result.branchAllocated}
                          </p>
                          <p className="text-sm text-default-600 mt-1">
                            Branch Allocated
                          </p>
                        </CardBody>
                      </Card>
                    )}
                  </div>
                  {result.unallocatedCount > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">
                        Unallocated Students:
                      </h4>
                      <div className="bg-default-100 p-3 rounded-lg max-h-40 overflow-y-auto">
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {result.unallocatedStudents.map(
                            ({ student, reason }) => (
                              <li key={student.id}>
                                <span className="font-medium">
                                  {student.name}
                                </span>{" "}
                                -{" "}
                                <span className="text-default-600">
                                  {reason}
                                </span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              {!result ? (
                <>
                  <Button color="default" variant="light" onPress={closeModal}>
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    onPress={handleAllocate}
                    isLoading={loading}
                    isDisabled={!selectedBranch}
                  >
                    Run Allocation
                  </Button>
                </>
              ) : (
                <Button color="primary" onPress={closeModal}>
                  Close
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};

const RoomsPage: React.FC = () => {
  const { buildingId } = useParams<{ buildingId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useSeatPlanner();
  const { rooms, buildings, loading, error } = state;
  const [floors, setFloors] = useState<Floor[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: "",
    capacity: 1,
    rows: 1,
    cols: 1,
    floorId: "",
    distance: 0,
  });
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (showCreateModal) {
      setNewRoom((prev) => ({ ...prev, capacity: prev.rows * prev.cols }));
    }
  }, [showCreateModal]);

  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editRoom, setEditRoom] = useState({
    name: "",
    capacity: 1,
    rows: 1,
    cols: 1,
    floorId: "",
    distance: 0,
    version: 0,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [myAllocations, setMyAllocations] = useState<Seat[]>([]);
  const [allocatingRoomId, setAllocatingRoomId] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [roomsWithEligibleBranches, setRoomsWithEligibleBranches] = useState<
    Set<string>
  >(new Set());
  const isAdmin = authService.isAdmin();

  const building = useMemo(
    () => buildings.find((b) => b.id === buildingId),
    [buildings, buildingId]
  );
  const buildingRooms = useMemo(
    () => rooms.filter((r) => r.buildingId === buildingId),
    [rooms, buildingId]
  );

  const fetchRoomsForBuilding = async () => {
    if (!buildingId) return;
    try {
      const roomsData = await api.getRoomsByBuilding(buildingId);
      dispatch({
        type: "GET_ROOMS_SUCCESS",
        payload: [
          ...rooms.filter((r) => r.buildingId !== buildingId),
          ...roomsData,
        ],
      });
      setDataLoaded(true);
      setInitialLoad(false);

      if (isAdmin) {
        const eligibleRoomIds = new Set<string>();
        for (const room of roomsData) {
          try {
            const eligibleBranches = await api.getEligibleBranches(
              undefined,
              room.id
            );
            if (eligibleBranches.length > 0) {
              eligibleRoomIds.add(room.id);
            }
          } catch (err) {
            console.error(
              `Failed to check eligibility for room ${room.id}:`,
              err
            );
          }
        }
        setRoomsWithEligibleBranches(eligibleRoomIds);
      }
    } catch (err) {
      dispatch({ type: "API_REQUEST_FAIL", payload: "Failed to fetch rooms." });
      setDataLoaded(true);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    dispatch({ type: "API_REQUEST_START" });

    // Load building data if not already loaded
    const loadBuildingData = async () => {
      if (buildingId && buildings.length === 0) {
        try {
          const buildingsData = await api.getBuildings();
          dispatch({ type: "GET_BUILDINGS_SUCCESS", payload: buildingsData });
        } catch (err) {
          console.error("Failed to fetch buildings:", err);
        }
      }

      // Load floors for this building
      if (buildingId) {
        try {
          const floorsData = await api.getFloors(buildingId);
          setFloors(floorsData);
        } catch (err) {
          console.error("Failed to fetch floors:", err);
        }
      }
    };

    loadBuildingData();
    fetchRoomsForBuilding();

    if (!isAdmin) {
      api.getStudentProfile().then((profile) => {
        setMyAllocations(profile.seats || []);
      });
    }

    const socketUrl = (
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api"
    ).replace("/api", "");
    const socket = io(socketUrl);
    socket.on("roomUpdated", fetchRoomsForBuilding);
    socket.on("seatUpdated", (updatedSeat: Seat) => {
      if (!isAdmin && updatedSeat.studentId === authService.getUser()?.id) {
        api
          .getStudentProfile()
          .then((profile) => setMyAllocations(profile.seats || []));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [buildingId, dispatch, isAdmin]);

  const studentHasSeatInRoom = (roomId: string) => {
    return myAllocations.some((seat) => seat.roomId === roomId);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;
    if (newRoom.capacity > newRoom.rows * newRoom.cols) {
      alert("Capacity cannot be greater than Rows x Columns.");
      return;
    }
    setCreateLoading(true);
    try {
      await api.createRoom({ buildingId, ...newRoom });
      setNewRoom({
        name: "",
        capacity: 1,
        rows: 1,
        cols: 1,
        floorId: "",
        distance: 0,
      });
      setShowCreateModal(false);
      // Small delay to ensure cache invalidation completes
      await new Promise((resolve) => setTimeout(resolve, 100));
      fetchRoomsForBuilding();
    } catch (err) {
      alert(`Failed to create room: ${(err as Error).message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    const maxCapacity = room.rows * room.cols;
    setEditRoom({
      name: room.name,
      capacity: maxCapacity,
      rows: room.rows,
      cols: room.cols,
      floorId: room.floorId,
      distance: room.distance,
      version: room.version,
    });
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    if (editRoom.capacity > editRoom.rows * editRoom.cols) {
      alert("Capacity cannot be greater than Rows x Columns.");
      return;
    }
    setEditLoading(true);
    try {
      await api.updateRoom(editingRoom.id, editRoom);
      setEditingRoom(null);
      // Small delay to ensure cache invalidation completes
      await new Promise((resolve) => setTimeout(resolve, 100));
      fetchRoomsForBuilding();
    } catch (err) {
      if (err instanceof ConflictError && err.currentData) {
        alert(
          "This room was just modified by another admin. Please close and try again."
        );
        setEditingRoom(null);
        // Small delay to ensure cache invalidation completes
        await new Promise((resolve) => setTimeout(resolve, 100));
        fetchRoomsForBuilding();
      } else {
        alert(`Failed to update room: ${(err as Error).message}`);
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteRoom = (room: Room) => {
    setRoomToDelete(room);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return;
    setDeleteLoading(roomToDelete.id);
    try {
      await api.deleteRoom(roomToDelete.id);
      // Small delay to ensure cache invalidation completes
      await new Promise((resolve) => setTimeout(resolve, 100));
      fetchRoomsForBuilding();
      setDeleteConfirmOpen(false);
      setRoomToDelete(null);
    } catch (err) {
      alert(`Failed to delete room: ${(err as Error).message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (initialLoad || (loading && buildingRooms.length === 0)) {
    return (
      <div>
        <Button
          variant="light"
          onPress={() => navigate("/buildings")}
          className="mb-6"
        >
          ← Back to Buildings
        </Button>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="rounded-lg">
            <div className="h-10 w-64 rounded-lg bg-default-200"></div>
          </Skeleton>
          {isAdmin && (
            <Button color="primary" onPress={() => setShowCreateModal(true)}>
              Add Room
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} variant="room" />
          ))}
        </div>
      </div>
    );
  }

  if (error && buildingRooms.length === 0)
    return <p className="text-danger text-center">{error}</p>;

  return (
    <div>
      <Button
        variant="light"
        onPress={() => navigate("/buildings")}
        className="mb-6"
      >
        ← Back to Buildings
      </Button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Rooms in {building?.name || "..."}
        </h1>
        {isAdmin && (
          <Button color="primary" onPress={() => setShowCreateModal(true)}>
            Add Room
          </Button>
        )}
      </div>

      {buildingRooms.length === 0 ? (
        <p className="text-default-500 text-center mt-8">
          No rooms found in this building.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buildingRooms.map((room) => {
            const availableSeats = room.capacity - room.claimed;
            const occupancyPercentage = (room.claimed / room.capacity) * 100;

            return (
              <Card
                key={room.id}
                className="relative hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-divider overflow-hidden"
              >
                {/* Occupancy indicator bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-default-200">
                  <div
                    className={`h-full transition-all duration-500 ${
                      occupancyPercentage >= 90
                        ? "bg-danger"
                        : occupancyPercentage >= 70
                        ? "bg-warning"
                        : "bg-success"
                    }`}
                    style={{ width: `${occupancyPercentage}%` }}
                  />
                </div>

                {!isAdmin && studentHasSeatInRoom(room.id) && (
                  <Tooltip content="You have a seat booked in this room">
                    <div className="absolute top-4 right-4 z-10">
                      <BookedIcon />
                    </div>
                  </Tooltip>
                )}

                <CardBody className="gap-4 pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-2xl font-bold text-foreground">
                      {room.name}
                    </h2>
                    {room.branchAllocated && (
                      <Chip
                        color="primary"
                        variant="flat"
                        size="sm"
                        className="shrink-0"
                      >
                        {
                          BRANCH_OPTIONS.find(
                            (b) => b.id === room.branchAllocated
                          )?.label
                        }
                      </Chip>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-default-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {room.rows} × {room.cols} layout
                      </span>
                      <span className="text-default-400">•</span>
                      <span className="text-sm font-medium">
                        {room.capacity} total seats
                      </span>
                    </div>
                    {room.floor && (
                      <p className="text-default-400 text-sm">
                        Floor: {room.floor.name} • Distance: {room.distance}m
                      </p>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/20 dark:to-success-800/20 p-4 rounded-xl border border-success-200 dark:border-success-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-bold text-success">
                          {availableSeats}
                        </p>
                        <p className="text-sm text-success-700 dark:text-success-300 mt-1">
                          seats available
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-default-700">
                          {room.claimed}
                        </p>
                        <p className="text-xs text-default-500 mt-1">
                          occupied
                        </p>
                      </div>
                    </div>
                  </div>
                </CardBody>

                <CardFooter className="flex-col gap-3 border-t border-divider bg-default-50 dark:bg-default-100/10 pt-4">
                  <Link to={`/rooms/${room.id}`} className="w-full">
                    <Button
                      color="primary"
                      variant="shadow"
                      className="w-full font-semibold"
                    >
                      View Seat Map
                    </Button>
                  </Link>

                  {isAdmin && (
                    <div className="w-full flex flex-col gap-2">
                      {dataLoaded && roomsWithEligibleBranches.has(room.id) && (
                        <Button
                          size="sm"
                          color="success"
                          variant="flat"
                          className="w-full"
                          onPress={() => setAllocatingRoomId(room.id)}
                        >
                          {room.branchAllocated
                            ? "Allocate Seats"
                            : "Allocate Branch"}
                        </Button>
                      )}
                      <div className="flex gap-2 w-full">
                        <Button
                          size="sm"
                          color="default"
                          variant="bordered"
                          className="flex-1"
                          onPress={() => handleEditRoom(room)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          color="danger"
                          variant="bordered"
                          className="flex-1"
                          onPress={() => handleDeleteRoom(room)}
                          isLoading={deleteLoading === room.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Room Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleCreateRoom}>
              <ModalHeader>Create New Room</ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Room Name"
                    variant="bordered"
                    value={newRoom.name}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, name: e.target.value })
                    }
                    required
                    className="md:col-span-2"
                  />
                  <Input
                    label="Rows"
                    type="number"
                    variant="bordered"
                    value={newRoom.rows.toString()}
                    onChange={(e) => {
                      const rows = Math.max(1, parseInt(e.target.value) || 1);
                      setNewRoom({
                        ...newRoom,
                        rows,
                        capacity: rows * newRoom.cols,
                      });
                    }}
                    required
                  />
                  <Input
                    label="Columns per Row"
                    type="number"
                    variant="bordered"
                    value={newRoom.cols.toString()}
                    onChange={(e) => {
                      const cols = Math.max(1, parseInt(e.target.value) || 1);
                      setNewRoom({
                        ...newRoom,
                        cols,
                        capacity: newRoom.rows * cols,
                      });
                    }}
                    required
                  />
                  <Input
                    label={`Seat Capacity (Max: ${
                      newRoom.rows * newRoom.cols
                    })`}
                    type="number"
                    variant="bordered"
                    value={newRoom.capacity.toString()}
                    onChange={(e) =>
                      setNewRoom({
                        ...newRoom,
                        capacity: parseInt(e.target.value) || 1,
                      })
                    }
                    required
                    className="md:col-span-2"
                  />
                  <Select
                    label="Floor"
                    variant="bordered"
                    selectedKeys={newRoom.floorId ? [newRoom.floorId] : []}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, floorId: e.target.value })
                    }
                    isRequired
                    className="md:col-span-2"
                  >
                    {floors.map((floor) => (
                      <SelectItem key={floor.id}>
                        {floor.name} (Floor {floor.number})
                      </SelectItem>
                    ))}
                  </Select>
                  <Input
                    label="Distance (meters)"
                    type="number"
                    variant="bordered"
                    value={newRoom.distance.toString()}
                    onChange={(e) =>
                      setNewRoom({
                        ...newRoom,
                        distance: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                    className="md:col-span-2"
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" isLoading={createLoading}>
                  Create Room
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Room Modal */}
      <Modal
        isOpen={!!editingRoom}
        onClose={() => setEditingRoom(null)}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleUpdateRoom}>
              <ModalHeader>Edit Room: {editingRoom?.name}</ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Room Name"
                    variant="bordered"
                    value={editRoom.name}
                    onChange={(e) =>
                      setEditRoom({ ...editRoom, name: e.target.value })
                    }
                    required
                    className="md:col-span-2"
                  />
                  <Input
                    label="Rows"
                    type="number"
                    variant="bordered"
                    value={editRoom.rows.toString()}
                    onChange={(e) => {
                      const rows = Math.max(1, parseInt(e.target.value) || 1);
                      setEditRoom({
                        ...editRoom,
                        rows,
                        capacity: rows * editRoom.cols,
                      });
                    }}
                    required
                  />
                  <Input
                    label="Columns per Row"
                    type="number"
                    variant="bordered"
                    value={editRoom.cols.toString()}
                    onChange={(e) => {
                      const cols = Math.max(1, parseInt(e.target.value) || 1);
                      setEditRoom({
                        ...editRoom,
                        cols,
                        capacity: editRoom.rows * cols,
                      });
                    }}
                    required
                  />
                  <Input
                    label={`Seat Capacity (Max: ${
                      editRoom.rows * editRoom.cols
                    })`}
                    type="number"
                    variant="bordered"
                    value={editRoom.capacity.toString()}
                    onChange={(e) =>
                      setEditRoom({
                        ...editRoom,
                        capacity: parseInt(e.target.value) || 1,
                      })
                    }
                    required
                    className="md:col-span-2"
                  />
                  <Select
                    label="Floor"
                    variant="bordered"
                    selectedKeys={editRoom.floorId ? [editRoom.floorId] : []}
                    onChange={(e) =>
                      setEditRoom({ ...editRoom, floorId: e.target.value })
                    }
                    isRequired
                    className="md:col-span-2"
                  >
                    {floors.map((floor) => (
                      <SelectItem key={floor.id}>
                        {floor.name} (Floor {floor.number})
                      </SelectItem>
                    ))}
                  </Select>
                  <Input
                    label="Distance (meters)"
                    type="number"
                    variant="bordered"
                    value={editRoom.distance.toString()}
                    onChange={(e) =>
                      setEditRoom({
                        ...editRoom,
                        distance: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                    className="md:col-span-2"
                  />
                </div>
                <p className="text-warning text-sm font-semibold">
                  Warning: Changing dimensions or capacity will regenerate all
                  seats in this room, unassigning any students.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" isLoading={editLoading}>
                  Update Room
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {allocatingRoomId && (
        <AllocationModal
          isOpen={true}
          onClose={() => setAllocatingRoomId(null)}
          buildingId={buildingId}
          roomId={allocatingRoomId}
          roomBranchAllocated={
            buildingRooms.find((r) => r.id === allocatingRoomId)
              ?.branchAllocated || null
          }
          onAllocationComplete={fetchRoomsForBuilding}
        />
      )}

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setRoomToDelete(null);
        }}
        onConfirm={confirmDeleteRoom}
        title="Delete Room"
        message={`Are you sure you want to delete "${roomToDelete?.name}"? This will also delete all seats in this room and unassign any students. This action cannot be undone.`}
        confirmText="Delete Room"
        isLoading={deleteLoading === roomToDelete?.id}
        variant="danger"
      />
    </div>
  );
};

export default RoomsPage;
