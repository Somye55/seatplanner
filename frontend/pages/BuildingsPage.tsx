import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Skeleton
} from '@heroui/react';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api } from '../services/apiService';
import { authService } from '../services/authService';
import { Building } from '../types';

const BuildingIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
    </svg>
);

const BuildingSkeleton: React.FC = () => (
    <Card className="w-full">
        <CardBody className="gap-4">
            <div className="flex items-center gap-6">
                <Skeleton className="rounded-lg">
                    <div className="h-16 w-16 rounded-lg bg-default-300"></div>
                </Skeleton>
                <div className="flex-1 space-y-3">
                    <Skeleton className="w-4/5 rounded-lg">
                        <div className="h-6 w-full rounded-lg bg-default-200"></div>
                    </Skeleton>
                    <Skeleton className="w-2/5 rounded-lg">
                        <div className="h-4 w-full rounded-lg bg-default-200"></div>
                    </Skeleton>
                    <Skeleton className="w-1/4 rounded-lg">
                        <div className="h-4 w-full rounded-lg bg-default-300"></div>
                    </Skeleton>
                </div>
            </div>
        </CardBody>
        <CardFooter className="justify-between border-t border-divider">
            <Skeleton className="w-24 rounded-lg">
                <div className="h-8 w-full rounded-lg bg-default-200"></div>
            </Skeleton>
            <div className="flex gap-2">
                <Skeleton className="w-12 rounded-lg">
                    <div className="h-8 w-full rounded-lg bg-default-200"></div>
                </Skeleton>
                <Skeleton className="w-16 rounded-lg">
                    <div className="h-8 w-full rounded-lg bg-default-200"></div>
                </Skeleton>
            </div>
        </CardFooter>
    </Card>
);

const BuildingsPage: React.FC = () => {
   const { state, dispatch } = useSeatPlanner();
   const { buildings, loading, error } = state;
   const [showCreateModal, setShowCreateModal] = useState(false);
   const [newBuilding, setNewBuilding] = useState({ name: '', code: '' });
   const [createLoading, setCreateLoading] = useState(false);
   const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
   const [editBuilding, setEditBuilding] = useState({ name: '', code: '' });
   const [editLoading, setEditLoading] = useState(false);
   const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
   const isAdmin = authService.isAdmin();

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'API_REQUEST_START' });
      try {
        const buildingsData = await api.getBuildings();
        dispatch({ type: 'GET_BUILDINGS_SUCCESS', payload: buildingsData });
      } catch (err) {
        dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to fetch buildings.' });
      }
    };

    fetchData();
  }, [dispatch]);

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.createBuilding(newBuilding);
      setNewBuilding({ name: '', code: '' });
      setShowCreateModal(false);
      const buildingsData = await api.getBuildings();
      dispatch({ type: 'GET_BUILDINGS_SUCCESS', payload: buildingsData });
    } catch (err) {
      console.error('Failed to create building:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditBuilding = (building: Building) => {
    setEditingBuilding(building);
    setEditBuilding({ name: building.name, code: building.code });
  };

  const handleUpdateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuilding) return;
    setEditLoading(true);
    try {
      await api.updateBuilding(editingBuilding.id, editBuilding);
      setEditingBuilding(null);
      setEditBuilding({ name: '', code: '' });
      const buildingsData = await api.getBuildings();
      dispatch({ type: 'GET_BUILDINGS_SUCCESS', payload: buildingsData });
    } catch (err) {
      console.error('Failed to update building:', err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteBuilding = async (buildingId: string) => {
    if (!confirm('Are you sure you want to delete this building? This action cannot be undone.')) return;
    setDeleteLoading(buildingId);
    try {
      await api.deleteBuilding(buildingId);
      const buildingsData = await api.getBuildings();
      dispatch({ type: 'GET_BUILDINGS_SUCCESS', payload: buildingsData });
    } catch (err) {
      console.error('Failed to delete building:', err);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading && buildings.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="w-48 rounded-lg">
            <div className="h-9 w-48 rounded-lg bg-default-200"></div>
          </Skeleton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <BuildingSkeleton key={i} />)}
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
          <Button
            color="primary"
            onPress={() => setShowCreateModal(true)}
          >
            Add Building
          </Button>
        )}
      </div>

      {!loading && buildings.length === 0 && !isAdmin && (
        <p className="text-default-500 text-center">No buildings found. You may need to seed the database.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildings.map((building) => (
          <Card key={building.id} className="hover:scale-105 transition-transform duration-300" isPressable>
            <CardBody className="gap-4">
              <div className="flex items-center gap-6">
                <div className="flex-shrink-0">
                  <BuildingIcon/>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{building.name}</h2>
                  <p className="text-default-500">{building.code}</p>
                  <p className="text-secondary font-semibold mt-2">{building.roomCount ?? 0} Rooms</p>
                </div>
              </div>
            </CardBody>
            <CardFooter className="justify-between border-t border-divider">
              <Link to={`/buildings/${building.id}/rooms`}>
                <Button color="primary" variant="light">
                  View Rooms
                </Button>
              </Link>
              {isAdmin && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    onPress={() => handleEditBuilding(building)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    onPress={() => handleDeleteBuilding(building.id)}
                    isLoading={deleteLoading === building.id}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Create Building Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} size="2xl">
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
                    onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Building Code"
                    variant="bordered"
                    value={newBuilding.code}
                    onChange={(e) => setNewBuilding({ ...newBuilding, code: e.target.value })}
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
      <Modal isOpen={!!editingBuilding} onClose={() => setEditingBuilding(null)} size="2xl">
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
                    onChange={(e) => setEditBuilding({ ...editBuilding, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Building Code"
                    variant="bordered"
                    value={editBuilding.code}
                    onChange={(e) => setEditBuilding({ ...editBuilding, code: e.target.value })}
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
    </div>
  );
};

export default BuildingsPage;
