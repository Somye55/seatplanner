import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api } from '../services/apiService';
import { authService } from '../services/authService';
import { Card, Spinner } from '../components/ui';
import { Building } from '../types';

const BuildingIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
    </svg>
);


const BuildingsPage: React.FC = () => {
   const { state, dispatch } = useSeatPlanner();
   const { buildings, loading, error } = state;
   const [showCreateForm, setShowCreateForm] = useState(false);
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

    // Fetch buildings only if they are not already in the state
    if (buildings.length === 0) {
        fetchData();
    }
  }, [dispatch, buildings.length]);

  if (loading && buildings.length === 0) return <Spinner />;
  if (error) return <p className="text-danger text-center">{error}</p>;

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.createBuilding(newBuilding);
      setNewBuilding({ name: '', code: '' });
      setShowCreateForm(false);
      // Refetch buildings
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
      // Refetch buildings
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
      // Refetch buildings
      const buildingsData = await api.getBuildings();
      dispatch({ type: 'GET_BUILDINGS_SUCCESS', payload: buildingsData });
    } catch (err) {
      console.error('Failed to delete building:', err);
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark">Buildings</h1>
        {isAdmin && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            {showCreateForm ? 'Cancel' : 'Add Building'}
          </button>
        )}
      </div>

      {showCreateForm && isAdmin && (
        <Card className="mb-6">
          <form onSubmit={handleCreateBuilding} className="p-6">
            <h2 className="text-xl font-bold mb-4">Create New Building</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building Name
                </label>
                <input
                  type="text"
                  required
                  value={newBuilding.name}
                  onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building Code
                </label>
                <input
                  type="text"
                  required
                  value={newBuilding.code}
                  onChange={(e) => setNewBuilding({ ...newBuilding, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {createLoading ? 'Creating...' : 'Create Building'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {editingBuilding && isAdmin && (
        <Card className="mb-6">
          <form onSubmit={handleUpdateBuilding} className="p-6">
            <h2 className="text-xl font-bold mb-4">Edit Building</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building Name
                </label>
                <input
                  type="text"
                  required
                  value={editBuilding.name}
                  onChange={(e) => setEditBuilding({ ...editBuilding, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building Code
                </label>
                <input
                  type="text"
                  required
                  value={editBuilding.code}
                  onChange={(e) => setEditBuilding({ ...editBuilding, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingBuilding(null)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {editLoading ? 'Updating...' : 'Update Building'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {!loading && buildings.length === 0 && !isAdmin && (
        <p className="text-gray-500 text-center">No buildings found. You may need to seed the database.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildings.map((building) => (
          <Card key={building.id} className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center space-x-6 mb-4">
                <div className="flex-shrink-0">
                  <BuildingIcon/>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-dark">{building.name}</h2>
                  <p className="text-gray-500">{building.code}</p>
                  <p className="text-secondary font-semibold mt-2">{building.roomCount ?? 0} Rooms</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <Link to={`/buildings/${building.id}/rooms`} className="text-primary hover:underline">
                  View Rooms
                </Link>
                {isAdmin && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditBuilding(building)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBuilding(building.id)}
                      disabled={deleteLoading === building.id}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50"
                    >
                      {deleteLoading === building.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BuildingsPage;
