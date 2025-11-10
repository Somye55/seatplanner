import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { useSeatPlanner } from "../context/SeatPlannerContext";
import { api } from "../services/apiService";
import { authService } from "../services/authService";
import { Building, Block } from "../types";
import {
  ConfirmationModal,
  LocationCard,
  BuildingIcon,
} from "../components/ui";

const BuildingSkeleton: React.FC = () => (
  <LocationCard
    icon={
      <Skeleton className="rounded-2xl">
        <div className="h-16 w-16 rounded-2xl bg-default-300"></div>
      </Skeleton>
    }
    title=""
    subtitle=""
    metadata={[
      { label: "Rooms", value: "" },
      { label: "Distance", value: "" },
    ]}
    colorScheme="indigo"
  />
);

const BuildingsPage: React.FC = () => {
  const { state, dispatch } = useSeatPlanner();
  const { buildings, loading, error } = state;
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBuilding, setNewBuilding] = useState({
    name: "",
    code: "",
    blockId: "",
    distance: 0,
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [editBuilding, setEditBuilding] = useState({
    name: "",
    code: "",
    blockId: "",
    distance: 0,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(
    null
  );
  const isAdmin = authService.isAdmin();

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: "API_REQUEST_START" });
      try {
        const [buildingsData, blocksData] = await Promise.all([
          api.getBuildings(),
          api.getBlocks(),
        ]);
        dispatch({ type: "GET_BUILDINGS_SUCCESS", payload: buildingsData });
        setBlocks(blocksData);
      } catch (err) {
        dispatch({
          type: "API_REQUEST_FAIL",
          payload: "Failed to fetch buildings.",
        });
      }
    };

    fetchData();
  }, [dispatch]);

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.createBuilding(newBuilding);
      setNewBuilding({ name: "", code: "", blockId: "", distance: 0 });
      setShowCreateModal(false);
      // Small delay to ensure cache invalidation completes
      await new Promise((resolve) => setTimeout(resolve, 100));
      const buildingsData = await api.getBuildings();
      dispatch({ type: "GET_BUILDINGS_SUCCESS", payload: buildingsData });
    } catch (err) {
      console.error("Failed to create building:", err);
      alert(`Failed to create building: ${(err as Error).message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditBuilding = (building: Building) => {
    setEditingBuilding(building);
    setEditBuilding({
      name: building.name,
      code: building.code,
      blockId: building.blockId,
      distance: building.distance,
    });
  };

  const handleUpdateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuilding) return;
    setEditLoading(true);
    try {
      await api.updateBuilding(editingBuilding.id, editBuilding);
      setEditingBuilding(null);
      setEditBuilding({ name: "", code: "", blockId: "", distance: 0 });
      // Small delay to ensure cache invalidation completes
      await new Promise((resolve) => setTimeout(resolve, 100));
      const buildingsData = await api.getBuildings();
      dispatch({ type: "GET_BUILDINGS_SUCCESS", payload: buildingsData });
    } catch (err) {
      console.error("Failed to update building:", err);
      alert(`Failed to update building: ${(err as Error).message}`);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteBuilding = (building: Building) => {
    setBuildingToDelete(building);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteBuilding = async () => {
    if (!buildingToDelete) return;
    setDeleteLoading(buildingToDelete.id);
    try {
      await api.deleteBuilding(buildingToDelete.id);
      // Small delay to ensure cache invalidation completes
      await new Promise((resolve) => setTimeout(resolve, 100));
      const buildingsData = await api.getBuildings();
      dispatch({ type: "GET_BUILDINGS_SUCCESS", payload: buildingsData });
      setDeleteConfirmOpen(false);
      setBuildingToDelete(null);
    } catch (err) {
      console.error("Failed to delete building:", err);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading && buildings.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="w-48 rounded-lg">
            <div className="h-10 w-48 rounded-lg bg-default-200"></div>
          </Skeleton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <BuildingSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) return <p className="text-danger text-center">{error}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Buildings</h1>
        {isAdmin && (
          <Button color="primary" onPress={() => setShowCreateModal(true)}>
            Add Building
          </Button>
        )}
      </div>

      {!loading && buildings.length === 0 && !isAdmin && (
        <p className="text-default-500 text-center">
          No buildings found. You may need to seed the database.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildings.map((building) => (
          <LocationCard
            key={building.id}
            icon={<BuildingIcon />}
            title={building.name}
            subtitle={`${building.code}${
              building.block ? ` • Block: ${building.block.name}` : ""
            }`}
            metadata={[
              { label: "Rooms", value: building.roomCount ?? 0 },
              { label: "Distance", value: `${building.distance}m` },
            ]}
            badge={
              building.block
                ? { text: building.block.code, color: "primary" }
                : undefined
            }
            colorScheme="indigo"
            footer={
              <div className="flex flex-col gap-2 w-full">
                <Link to={`/buildings/${building.id}/rooms`} className="w-full">
                  <Button color="primary" variant="shadow" className="w-full">
                    View Rooms
                  </Button>
                </Link>
                {isAdmin && (
                  <div className="flex gap-2 w-full">
                    <Button
                      size="sm"
                      color="default"
                      variant="bordered"
                      onPress={() => handleEditBuilding(building)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      color="danger"
                      variant="bordered"
                      onPress={() => handleDeleteBuilding(building)}
                      isLoading={deleteLoading === building.id}
                      className="flex-1"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            }
          />
        ))}
      </div>

      {/* Create Building Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleCreateBuilding}>
              <ModalHeader>Create New Building</ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Input
                    label="Building Name"
                    variant="bordered"
                    value={newBuilding.name}
                    onChange={(e) =>
                      setNewBuilding({ ...newBuilding, name: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="Building Code"
                    variant="bordered"
                    value={newBuilding.code}
                    onChange={(e) =>
                      setNewBuilding({ ...newBuilding, code: e.target.value })
                    }
                    required
                  />
                  <Select
                    label="Block"
                    variant="bordered"
                    selectedKeys={
                      newBuilding.blockId
                        ? new Set([newBuilding.blockId])
                        : new Set()
                    }
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string;
                      setNewBuilding({
                        ...newBuilding,
                        blockId: selectedKey || "",
                      });
                    }}
                    isRequired
                  >
                    {blocks.map((block) => (
                      <SelectItem
                        key={block.id}
                        textValue={`${block.name} (${block.code})`}
                      >
                        {block.name} ({block.code})
                      </SelectItem>
                    ))}
                  </Select>
                  <Input
                    label="Distance (meters)"
                    type="number"
                    variant="bordered"
                    value={newBuilding.distance.toString()}
                    onChange={(e) =>
                      setNewBuilding({
                        ...newBuilding,
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
                  Create Building
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Building Modal */}
      <Modal
        isOpen={!!editingBuilding}
        onClose={() => setEditingBuilding(null)}
        size="2xl"
      >
        <ModalContent>
          {(onClose) => (
            <form onSubmit={handleUpdateBuilding}>
              <ModalHeader>Edit Building</ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-4">
                  <Input
                    label="Building Name"
                    variant="bordered"
                    value={editBuilding.name}
                    onChange={(e) =>
                      setEditBuilding({ ...editBuilding, name: e.target.value })
                    }
                    required
                  />
                  <Input
                    label="Building Code"
                    variant="bordered"
                    value={editBuilding.code}
                    onChange={(e) =>
                      setEditBuilding({ ...editBuilding, code: e.target.value })
                    }
                    required
                  />
                  <Select
                    label="Block"
                    variant="bordered"
                    selectedKeys={
                      editBuilding.blockId
                        ? new Set([editBuilding.blockId])
                        : new Set()
                    }
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string;
                      setEditBuilding({
                        ...editBuilding,
                        blockId: selectedKey || "",
                      });
                    }}
                    isRequired
                  >
                    {blocks.map((block) => (
                      <SelectItem
                        key={block.id}
                        textValue={`${block.name} (${block.code})`}
                      >
                        {block.name} ({block.code})
                      </SelectItem>
                    ))}
                  </Select>
                  <Input
                    label="Distance (meters)"
                    type="number"
                    variant="bordered"
                    value={editBuilding.distance.toString()}
                    onChange={(e) =>
                      setEditBuilding({
                        ...editBuilding,
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
                  Update Building
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
          setBuildingToDelete(null);
        }}
        onConfirm={confirmDeleteBuilding}
        title="Delete Building"
        message={`Are you sure you want to delete "${buildingToDelete?.name}" (${buildingToDelete?.code})? This will also delete all rooms and seats in this building. This action cannot be undone.`}
        confirmText="Delete Building"
        isLoading={deleteLoading === buildingToDelete?.id}
        variant="danger"
      />
    </div>
  );
};

export default BuildingsPage;
