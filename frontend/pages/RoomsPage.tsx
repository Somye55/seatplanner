import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api, ConflictError } from '../services/apiService';
import { authService } from '../services/authService';
import { Card, Spinner } from '../components/ui';
import { Room, Seat } from '../types';
import io from 'socket.io-client';

const BookedIcon: React.FC = () => (
    <div className="absolute top-2 right-2 bg-accent text-white rounded-full p-1.5 shadow-lg" title="You have a seat booked in this room">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
    </div>
);


const RoomsPage: React.FC = () => {
  const { buildingId } = useParams<{ buildingId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useSeatPlanner();
  const { rooms, buildings, loading, error } = state;
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', capacity: 1, rows: 1, cols: 1 });
  const [createLoading, setCreateLoading] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editRoom, setEditRoom] = useState({ name: '', capacity: 1, rows: 1, cols: 1 });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [myAllocations, setMyAllocations] = useState<Seat[]>([]);
  const isAdmin = authService.isAdmin();

  const building = useMemo(() => buildings.find(b => b.id === buildingId), [buildings, buildingId]);
  const buildingRooms = useMemo(() => rooms.filter(r => r.buildingId === buildingId), [rooms, buildingId]);

  const fetchRoomsForBuilding = async () => {
      if (!buildingId) return;
      try {
        const roomsData = await api.getRoomsByBuilding(buildingId);
        dispatch({ type: 'GET_ROOMS_SUCCESS', payload: [...rooms.filter(r => r.buildingId !== buildingId), ...roomsData] });
      } catch (err) {
        dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to fetch rooms.' });
      }
  };

  useEffect(() => {
    dispatch({ type: 'API_REQUEST_START' });
    fetchRoomsForBuilding();

    if (!isAdmin) {
        api.getStudentProfile().then(profile => {
            setMyAllocations(profile.seats || []);
        });
    }

    const socketUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace('/api', '');
    const socket = io(socketUrl);
    socket.on('roomUpdated', fetchRoomsForBuilding);
    socket.on('seatUpdated', (updatedSeat: Seat) => {
        if (!isAdmin && updatedSeat.studentId === authService.getUser()?.id) {
             api.getStudentProfile().then(profile => setMyAllocations(profile.seats || []));
        }
    });

    return () => { socket.disconnect(); };
  }, [buildingId, dispatch, isAdmin]);

  const studentHasSeatInRoom = (roomId: string) => {
      return myAllocations.some(seat => seat.roomId === roomId);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingId) return;
    if (newRoom.capacity > newRoom.rows * newRoom.cols) {
        alert('Capacity cannot be greater than Rows x Columns.');
        return;
    }
    setCreateLoading(true);
    try {
      await api.createRoom({ buildingId, ...newRoom });
      setNewRoom({ name: '', capacity: 1, rows: 1, cols: 1 });
      setShowCreateForm(false);
      fetchRoomsForBuilding();
    } catch (err) {
      alert(`Failed to create room: ${(err as Error).message}`);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setEditRoom({ name: room.name, capacity: room.capacity, rows: room.rows, cols: room.cols, version: room.version });
  };

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
     if (editRoom.capacity > editRoom.rows * editRoom.cols) {
        alert('Capacity cannot be greater than Rows x Columns.');
        return;
    }
    setEditLoading(true);
    try {
      await api.updateRoom(editingRoom.id, editRoom);
      setEditingRoom(null);
      fetchRoomsForBuilding();
    } catch (err) {
      if (err instanceof ConflictError && err.currentData) {
        alert('This room was just modified by another admin. Please close and try again.');
        setEditingRoom(null);
        fetchRoomsForBuilding();
      } else {
        alert(`Failed to update room: ${(err as Error).message}`);
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room and all its seats? This action cannot be undone.')) return;
    setDeleteLoading(roomId);
    try {
      await api.deleteRoom(roomId);
      fetchRoomsForBuilding();
    } catch (err) {
      alert(`Failed to delete room: ${(err as Error).message}`);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading && buildingRooms.length === 0) return <Spinner />;
  if (error && buildingRooms.length === 0) return <p className="text-danger text-center">{error}</p>;

  return (
    <div>
      <button onClick={() => navigate('/buildings')} className="mb-6 text-primary hover:underline">&larr; Back to Buildings</button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-dark">Rooms in {building?.name || '...'}</h1>
        {isAdmin && (
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-primary text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            {showCreateForm ? 'Cancel' : 'Add Room'}
          </button>
        )}
      </div>

      {showCreateForm && isAdmin && (
        <Card className="mb-6">
          <form onSubmit={handleCreateRoom} className="p-6">
            <h2 className="text-xl font-bold mb-4">Create New Room</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                <input type="text" required value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rows</label>
                <input type="number" required min="1" value={newRoom.rows} onChange={(e) => setNewRoom({ ...newRoom, rows: Math.max(1, parseInt(e.target.value)) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Columns per Row</label>
                <input type="number" required min="1" value={newRoom.cols} onChange={(e) => setNewRoom({ ...newRoom, cols: Math.max(1, parseInt(e.target.value)) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Seat Capacity (Max: {newRoom.rows * newRoom.cols})</label>
                <input type="number" required min="1" max={newRoom.rows * newRoom.cols} value={newRoom.capacity} onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={createLoading} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{createLoading ? 'Creating...' : 'Create Room'}</button>
            </div>
          </form>
        </Card>
      )}

      {editingRoom && isAdmin && (
        <Card className="mb-6">
          <form onSubmit={handleUpdateRoom} className="p-6">
            <h2 className="text-xl font-bold mb-4">Edit Room: {editingRoom.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                <input type="text" required value={editRoom.name} onChange={(e) => setEditRoom({ ...editRoom, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rows</label>
                <input type="number" required min="1" value={editRoom.rows} onChange={(e) => setEditRoom({ ...editRoom, rows: Math.max(1, parseInt(e.target.value)) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Columns per Row</label>
                <input type="number" required min="1" value={editRoom.cols} onChange={(e) => setEditRoom({ ...editRoom, cols: Math.max(1, parseInt(e.target.value)) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
               <div className="lg:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 mb-1">Seat Capacity (Max: {editRoom.rows * editRoom.cols})</label>
                <input type="number" required min="1" max={editRoom.rows * editRoom.cols} value={editRoom.capacity} onChange={(e) => setEditRoom({ ...editRoom, capacity: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <p className="text-xs text-amber-600 mt-2 font-semibold">Warning: Changing dimensions or capacity will regenerate all seats in this room, unassigning any students.</p>
            <div className="mt-4 flex justify-end space-x-2">
              <button type="button" onClick={() => setEditingRoom(null)} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={editLoading} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{editLoading ? 'Updating...' : 'Update Room'}</button>
            </div>
          </form>
        </Card>
      )}

      {buildingRooms.length === 0 ? (
          <p className="text-gray-500 text-center mt-8">No rooms found in this building.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buildingRooms.map((room) => (
            <Card key={room.id} className="relative hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              {!isAdmin && studentHasSeatInRoom(room.id) && <BookedIcon />}
              <div className="p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-dark">{room.name}</h2>
                  <p className="text-gray-500">Capacity: {room.capacity} ({room.rows} rows x {room.cols} cols)</p>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-accent font-bold text-lg">{room.capacity - room.claimed} seats available</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <Link to={`/rooms/${room.id}`} className="text-primary hover:underline">
                    View Seats
                  </Link>
                  {isAdmin && (
                    <div className="flex space-x-2">
                      <button onClick={() => handleEditRoom(room)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600">Edit</button>
                      <button onClick={() => handleDeleteRoom(room.id)} disabled={deleteLoading === room.id} className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50">{deleteLoading === room.id ? 'Deleting...' : 'Delete'}</button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomsPage;
