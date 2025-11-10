import React, { useEffect, useState } from "react";
import {
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
} from "@heroui/react";
import { ConfirmationModal, LocationCard, FloorIcon } from "../components/ui";
import { api } from "../services/apiService";
import { authService } from "../services/authService";
import { Floor, Building } from "../types";

const FloorSkeleton: React.FC = () => (
  <div className="border-2 border-green-200 dark:border-green-800 rounded-xl p-4">
    <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/30 rounded-xl p-4 mb-4">
      <div className="flex items-start gap-4">
        <Skeleton className="rounded-2xl flex-shrink-0">
          <div className="h-16 w-16 rounded-2xl bg-default-300"></div>
        </Skeleton>
        <div className="flex-1 min-w-0">
          <Skeleton className="w-24 rounded-lg mb-2">
            <div className="h-6 w-24 rounded-lg bg-default-200"></div>
          </Skeleton>
          <Skeleton className="w-32 rounded-lg">
            <div className="h-4 w-32 rounded-lg bg-default-200"></div>
          </Skeleton>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-default-100 dark:bg-default-50/10 rounded-lg p-3">
        <p className="text-xs text-default-500 uppercase tracking-wide">
          Floor Number
        </p>
        <Skeleton className="w-8 rounded-lg mt-1">
          <div className="h-6 w-8 rounded-lg bg-default-200"></div>
        </Skeleton>
      </div>
      <div className="bg-default-100 dark:bg-default-50/10 rounded-lg p-3">
        <p className="text-xs text-default-500 uppercase tracking-wide">
          Distance
        </p>
        <Skeleton className="w-12 rounded-lg mt-1">
          <div className="h-6 w-12 rounded-lg bg-default-200"></div>
        </Skeleton>
      </div>
    </div>
  </div>
);

const FloorsPage: React.FC = () => {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFloor, setNewFloor] = useState({
    name: "",
    number: 0,
    buildingId: "",
    distance: 0,
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [editFloor, setEditFloor] = useState({
    name: "",
    number: 0,
    buildingId: "",
    distance: 0,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [floorToDelete, setFloorToDelete] = useState<Floor | null>(null);
  const isAdmin = authService.isAdmin();

  const fetchFloors = async (buildingId?: string) => {
    setLoading(true);
    try {
      const data = await api.getFloors(buildingId);
      setFloors(data);
      setError("");
    } catch (err) {
      setError("Failed to fetch floors.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const buildingsData = await api.getBuildings();
        setBuildings(buildingsData);
        if (buildingsData.length > 0) {
          setSelectedBuildingId(buildingsData[0].id);
          fetchFloors(buildingsData[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError("Failed to fetch buildings.");
        console.error(err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedBuildingId) {
      fetchFloors(selectedBuildingId);
    }
  }, [selectedBuildingId]);

  const handleCreateFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.createFloor(newFloor);
      setNewFloor({ name: "", number: 0, buildingId: "", distance: 0 });
      setShowCreateModal(false);
      await new Promise((resolve) => setTimeout(resolve, 100));
      fetchFloors(selectedBuildingId);
    } catch (err) {
      console.error("Failed to create floor:", err);
      alert(`Failed to create floor: ${(err as Error).message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditFloor = (floor: Floor) => {
    setEditingFloor(floor);
    setEditFloor({
      name: floor.name,
      number: floor.number,
      buildingId: floor.buildingId,
      distance: floor.distance,
    });
  };

  const handleUpdateFloor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFloor) return;
    setEditLoading(true);
    try {
      await api.updateFloor(editingFloor.id, editFloor);
      setEditingFloor(null);
      setEditFloor({ name: "", number: 0, buildingId: "", distance: 0 });
      await new Promise((resolve) => setTimeout(resolve, 100));
      fetchFloors(selectedBuildingId);
    } catch (err) {
      console.error("Failed to update floor:", err);
      alert(`Failed to update floor: ${(err as Error).message}`);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteFloor = (floor: Floor) => {
    setFloorToDelete(floor);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteFloor = async () => {
    if (!floorToDelete) return;
    setDeleteLoading(floorToDelete.id);
    try {
      await api.deleteFloor(floorToDelete.id);
      await new Promise((resolve) => setTimeout(resolve, 100));
      fetchFloors(selectedBuildingId);
      setDeleteConfirmOpen(false);
      setFloorToDelete(null);
    } catch (err) {
      console.error("Failed to delete floor:", err);
      alert(`Failed to delete floor: ${(err as Error).message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading && floors.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="w-48 rounded-lg">
            <div className="h-10 w-48 rounded-lg bg-default-200"></div>
          </Skeleton>
        </div>
        <div className="mb-6">
          <Skeleton className="w-80 rounded-xl">
            <div className="h-14 w-80 rounded-xl bg-default-200"></div>
          </Skeleton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <FloorSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <p className="text-danger text-center">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Floors</h1>
        {isAdmin && (
          <Button color="primary" onPress={() => setShowCreateModal(true)}>
            Add Floor
          </Button>
        )}
      </div>

      {buildings.length > 0 && (
        <div className="mb-6">
          <Select
            label="Filter by Building"
            variant="bordered"
            selectedKeys={
              selectedBuildingId ? new Set([selectedBuildingId]) : new Set()
            }
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0] as string;
              setSelectedBuildingId(selectedKey || "");
            }}
            className="max-w-xs"
          >
            {buildings.map((building) => (
              <SelectItem
                key={building.id}
                textValue={`${building.name} (${building.code})`}
              >
                {building.name} ({building.code})
              </SelectItem>
            ))}
          </Select>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <FloorSkeleton key={i} />
          ))}
        </div>
      ) : floors.length === 0 ? (
        <p className="text-default-500 text-center">
          No floors found for this building.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {floors.map((floor) => (
            <LocationCard
              key={floor.id}
              icon={<FloorIcon />}
              title={floor.name}
              subtitle={`Floor ${floor.number}${
                floor.building ? ` • ${floor.building.name}` : ""
              }`}
              metadata={[
                { label: "Floor Number", value: floor.number },
                { label: "Distance", value: `${floor.distance}m` },
              ]}
              badge={
                floor.building
                  ? { text: floor.building.code, color: "primary" }
                  : undefined
              }
              colorScheme="green"
              footer={
                isAdmin ? (
                  <div className="flex gap-2 w-full">
                    <Button
                      size="sm"
                      color="default"
                      variant="bordered"
                      onPress={() => handleEditFloor(floor)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      color="danger"
                      variant="bordered"
                      onPress={() => handleDeleteFloor(floor)}
                      isLoading={deleteLoading === floor.id}
                      className="flex-1"
                    >
                      Delete
                    </Button>
                  </div>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Create Floor Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleCreateFloor}>
              <ModalHeader>Create New Floor</ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Input
                    label="Floor Name"
                    variant="bordered"
                    value={newFloor.name}
                    onChange={(e) =>
                      setNewFloor({ ...newFloor, name: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="Floor Number"
                    type="number"
                    variant="bordered"
                    value={newFloor.number.toString()}
                    onChange={(e) =>
                      setNewFloor({
                        ...newFloor,
                        number: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                  />
                  <Select
                    label="Building"
                    variant="bordered"
                    selectedKeys={
                      newFloor.buildingId
                        ? new Set([newFloor.buildingId])
                        : new Set()
                    }
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string;
                      setNewFloor({
                        ...newFloor,
                        buildingId: selectedKey || "",
                      });
                    }}
                    isRequired
                  >
                    {buildings.map((building) => (
                      <SelectItem
                        key={building.id}
                        textValue={`${building.name} (${building.code})`}
                      >
                        {building.name} ({building.code})
                      </SelectItem>
                    ))}
                  </Select>
                  <Input
                    label="Distance (meters)"
                    type="number"
                    variant="bordered"
                    value={newFloor.distance.toString()}
                    onChange={(e) =>
                      setNewFloor({
                        ...newFloor,
                        distance: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" isLoading={createLoading}>
                  Create Floor
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Floor Modal */}
      <Modal
        isOpen={!!editingFloor}
        onClose={() => setEditingFloor(null)}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleUpdateFloor}>
              <ModalHeader>Edit Floor</ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Input
                    label="Floor Name"
                    variant="bordered"
                    value={editFloor.name}
                    onChange={(e) =>
                      setEditFloor({ ...editFloor, name: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="Floor Number"
                    type="number"
                    variant="bordered"
                    value={editFloor.number.toString()}
                    onChange={(e) =>
                      setEditFloor({
                        ...editFloor,
                        number: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                  />
                  <Select
                    label="Building"
                    variant="bordered"
                    selectedKeys={
                      editFloor.buildingId
                        ? new Set([editFloor.buildingId])
                        : new Set()
                    }
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string;
                      setEditFloor({
                        ...editFloor,
                        buildingId: selectedKey || "",
                      });
                    }}
                    isRequired
                  >
                    {buildings.map((building) => (
                      <SelectItem
                        key={building.id}
                        textValue={`${building.name} (${building.code})`}
                      >
                        {building.name} ({building.code})
                      </SelectItem>
                    ))}
                  </Select>
                  <Input
                    label="Distance (meters)"
                    type="number"
                    variant="bordered"
                    value={editFloor.distance.toString()}
                    onChange={(e) =>
                      setEditFloor({
                        ...editFloor,
                        distance: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" isLoading={editLoading}>
                  Update Floor
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setFloorToDelete(null);
        }}
        onConfirm={confirmDeleteFloor}
        title="Delete Floor"
        message={`Are you sure you want to delete "${floorToDelete?.name}" (Floor ${floorToDelete?.number})? This will also delete all rooms and seats on this floor. This action cannot be undone.`}
        confirmText="Delete Floor"
        isLoading={deleteLoading === floorToDelete?.id}
        variant="danger"
      />
    </div>
  );
};

export default FloorsPage;
