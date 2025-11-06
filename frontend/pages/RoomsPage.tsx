import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api, ConflictError } from '../services/apiService';
import { authService } from '../services/authService';
import { Card, Spinner, Button, Modal } from '../components/ui';
import { Room, Seat, Branch, AllocationSummary, BRANCH_OPTIONS } from '../types';
import io from 'socket.io-client';

const BookedIcon: React.FC = () => (
    <div className="absolute top-2 right-2 bg-accent text-white rounded-full p-1.5 shadow-lg" title="You have a seat booked in this room">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
    </div>
);


const AllocationModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    buildingId: string | undefined,
    roomId: string,
    onAllocationComplete: () => void
}> = ({ isOpen, onClose, buildingId, roomId, onAllocationComplete }) => {
    const [eligibleBranches, setEligibleBranches] = useState<{id: Branch, label: string}[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<Branch | ''>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<AllocationSummary | null>(null);

    useEffect(() => {
        if (isOpen && buildingId) {
            setLoading(true);
            setError('');
            setResult(null);
            api.getEligibleBranches(buildingId)
                .then(branches => {
                    const branchOptions = branches.map(branchId => ({
                        id: branchId,
                        label: BRANCH_OPTIONS.find(b => b.id === branchId)?.label || branchId
                    }));
                    setEligibleBranches(branchOptions);
                    if (branchOptions.length > 0) {
                        setSelectedBranch(branchOptions[0].id);
                    } else {
                        setSelectedBranch('');
                    }
                })
                .catch(() => setError("Failed to load eligible branches."))
                .finally(() => setLoading(false));
        }
    }, [isOpen, buildingId]);

    const handleAllocate = async () => {
        if (!selectedBranch) {
            setError("No branch selected.");
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const response = await api.allocateBranchToRoom(selectedBranch, roomId);
            setResult(response.summary);
            onAllocationComplete();
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const closeModal = () => {
        setResult(null);
        setError('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={closeModal} title="Allocate Branch to Room">
            {!result ? (
            <div>
                <p className="mb-4 text-sm text-gray-600">Select a branch to allocate all of its unallocated students to available seats within this room.</p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="branch" className="block text-sm font-medium text-gray-700">Club / Branch</label>
                        <select id="branch" name="branch" className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value as Branch)} disabled={loading || eligibleBranches.length === 0}>
                            {loading && <option>Loading branches...</option>}
                            {!loading && eligibleBranches.length === 0 && <option>No eligible branches found</option>}
                            {eligibleBranches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                        </select>
                        {!loading && eligibleBranches.length === 0 && (
                            <p className="text-xs text-gray-500 mt-2">
                                All branches are either already allocated to other buildings or have no unallocated students.
                            </p>
                        )}
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                <div className="mt-6 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                    <Button onClick={handleAllocate} disabled={loading || !selectedBranch}>{loading ? 'Allocating...' : 'Run Allocation'}</Button>
                </div>
            </div>
            ) : (
            <div>
                <h3 className="font-bold text-lg text-green-700 mb-4">Allocation Complete!</h3>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-2 gap-4 text-center mb-4">
                        <div className="bg-white p-3 rounded-md shadow-sm">
                            <p className="text-3xl font-bold text-accent">{result.allocatedCount}</p>
                            <p className="text-sm text-gray-600 mt-1">Students Allocated</p>
                        </div>
                        <div className="bg-white p-3 rounded-md shadow-sm">
                            <p className="text-3xl font-bold text-danger">{result.unallocatedCount}</p>
                            <p className="text-sm text-gray-600 mt-1">Students Unallocated</p>
                        </div>
                    </div>
                </div>
                 {result.unallocatedCount > 0 && (
                    <div className="mt-4">
                        <h4 className="font-semibold text-dark mb-2">Unallocated Students:</h4>
                        <ul className="list-disc list-inside bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto text-sm">
                            {result.unallocatedStudents.map(({ student, reason }) => (
                                <li key={student.id} className="mb-1">
                                    <span className="font-medium">{student.name}</span> - <span className="text-gray-600">{reason}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <div className="mt-6 flex justify-end">
                    <Button onClick={closeModal}>Close</Button>
                </div>
            </div>
            )}
        </Modal>
    );
};

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
  const [allocatingRoomId, setAllocatingRoomId] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const isAdmin = authService.isAdmin();

  const building = useMemo(() => buildings.find(b => b.id === buildingId), [buildings, buildingId]);
  const buildingRooms = useMemo(() => rooms.filter(r => r.buildingId === buildingId), [rooms, buildingId]);

  const fetchRoomsForBuilding = async () => {
      if (!buildingId) return;
      try {
        const roomsData = await api.getRoomsByBuilding(buildingId);
        dispatch({ type: 'GET_ROOMS_SUCCESS', payload: [...rooms.filter(r => r.buildingId !== buildingId), ...roomsData] });
        setDataLoaded(true);
      } catch (err) {
        dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to fetch rooms.' });
        setDataLoaded(true);
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
                  {room.branchAllocated && (
                    <p className="text-primary font-semibold text-sm mt-2">
                      Allocated to: {BRANCH_OPTIONS.find(b => b.id === room.branchAllocated)?.label}
                    </p>
                  )}
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-accent font-bold text-lg">{room.capacity - room.claimed} seats available</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <Link to={`/rooms/${room.id}`} className="text-primary hover:underline">
                    View Seats
                  </Link>
                  {isAdmin && (
                    <div className="flex flex-col gap-2">
                      {dataLoaded && !room.branchAllocated && (
                        <button 
                          onClick={() => setAllocatingRoomId(room.id)} 
                          className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600"
                        >
                          Allocate Branch
                        </button>
                      )}
                      <div className="flex space-x-2">
                        <button onClick={() => handleEditRoom(room)} className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600">Edit</button>
                        <button onClick={() => handleDeleteRoom(room.id)} disabled={deleteLoading === room.id} className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50">{deleteLoading === room.id ? 'Deleting...' : 'Delete'}</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      {allocatingRoomId && (
        <AllocationModal 
          isOpen={true} 
          onClose={() => setAllocatingRoomId(null)} 
          buildingId={buildingId} 
          roomId={allocatingRoomId}
          onAllocationComplete={() => {
            setAllocatingRoomId(null);
            fetchRoomsForBuilding();
          }}
        />
      )}
    </div>
  );
};

export default RoomsPage;
