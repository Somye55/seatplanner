import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api } from '../services/apiService';
import { authService } from '../services/authService';
import { Spinner, Modal, Button } from '../components/ui';
import { Seat, SeatStatus, Student, Room } from '../types';
import io from 'socket.io-client';

const SeatComponent: React.FC<{ seat: Seat; student?: Student; onClick: () => void; isClickable: boolean; }> = ({ seat, student, onClick, isClickable }) => {
  const getStatusClasses = (status: SeatStatus) => {
    switch (status) {
      case SeatStatus.Available:
        return 'bg-green-100 border-green-400 hover:bg-green-200 text-green-800';
      case SeatStatus.Allocated:
        return 'bg-gray-200 border-gray-500 hover:bg-gray-300 text-gray-800';
      case SeatStatus.Broken:
        return 'bg-red-200 border-red-500 hover:bg-red-300 text-red-800';
      default:
        // Fallback for any unexpected status
        return 'bg-yellow-100 border-yellow-400 text-yellow-800';
    }
  };

  const cursorClass = isClickable ? 'cursor-pointer' : 'cursor-default';

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`w-16 h-16 rounded-lg border-2 flex flex-col justify-center items-center transition-all ${getStatusClasses(seat.status)} ${cursorClass}`}
      title={seat.status === SeatStatus.Allocated ? `Allocated to: ${student?.name}` : seat.status}
    >
      <span className="text-sm font-bold">{seat.label}</span>
      {seat.status === SeatStatus.Allocated && (
         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 mt-1" viewBox="0 0 20 20" fill="currentColor">
           <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
         </svg>
       )}
        {seat.status === SeatStatus.Broken && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 mt-1" viewBox="0 0 20 20" fill="currentColor">
             <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
         </svg>
       )}
    </div>
  );
};

const SeatMapPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useSeatPlanner();
  const { seats: allSeats, students, rooms, loading } = state;
  const isAdmin = authService.isAdmin();
  const currentUser = authService.getUser();

  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [claimingSeat, setClaimingSeat] = useState(false);
  const [markingSeat, setMarkingSeat] = useState(false);

  const roomSeats = useMemo(() => allSeats.filter(s => s.roomId === roomId).sort((a,b) => a.row - b.row || a.col - b.col), [allSeats, roomId]);
  
  const studentForCurrentUser = useMemo(() => {
    if (isAdmin || !currentUser) return null;
    return students.find(s => s.email === currentUser.email);
  }, [students, currentUser, isAdmin]);

  const currentUserHasSeatInRoom = useMemo(() => {
    if (!studentForCurrentUser) return false;
    return roomSeats.some(s => s.studentId === studentForCurrentUser.id);
  }, [roomSeats, studentForCurrentUser]);

  const maxRow = useMemo(() => roomSeats.length > 0 ? Math.max(...roomSeats.map(s => s.row)) + 1 : 0, [roomSeats]);
  const maxCol = useMemo(() => roomSeats.length > 0 ? Math.max(...roomSeats.map(s => s.col)) + 1 : 0, [roomSeats]);

  const grid = useMemo(() => {
    if (maxRow === 0 || maxCol === 0) return [];
    const g: (Seat | null)[][] = Array.from({length: maxRow}, () => Array(maxCol).fill(null));
    roomSeats.forEach(seat => {
      if (seat.row < maxRow && seat.col < maxCol) {
        g[seat.row][seat.col] = seat;
      }
    });
    return g;
  }, [roomSeats, maxRow, maxCol]);

  useEffect(() => {
    const fetchData = async () => {
      if (!roomId) return;
      dispatch({ type: 'API_REQUEST_START' });
      try {
        const [roomData, seatsData] = await Promise.all([
          api.getRoomById(roomId),
          api.getSeatsByRoom(roomId)
        ]);
        if (!roomData) throw new Error("Room not found");

        setCurrentRoom(roomData);
        // Replace seats for the current room, keeping others intact
        const otherSeats = allSeats.filter(s => s.roomId !== roomId);
        dispatch({ type: 'GET_SEATS_SUCCESS', payload: [...otherSeats, ...seatsData] });
      } catch (err) {
        dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to fetch seat map.' });
      }
    };
    fetchData();

    // Socket.io for real-time updates
    const socketUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace('/api', '');
    const socket = io(socketUrl);

    // Listen for single seat updates (e.g., claim, status change)
    socket.on('seatUpdated', (updatedSeat: Seat) => {
      // Only update if it's for the room we are currently viewing
      if (updatedSeat.roomId === roomId) {
        dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: updatedSeat });
      }
    });

    // Listen for bulk seat updates (e.g., after a plan allocation)
    socket.on('seatsUpdated', (allUpdatedSeats: Seat[]) => {
      // The payload is the complete list of all seats.
      // We can replace our entire seat state in the context.
      dispatch({ type: 'GET_SEATS_SUCCESS', payload: allUpdatedSeats });
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, dispatch]);

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);
    setIsModalOpen(true);
  };
  
  const handleStatusChange = async (newStatus: SeatStatus) => {
    if (!selectedSeat || !isAdmin) return;

    setMarkingSeat(true);

    try {
      // API call to update the backend
      const updatedSeat = await api.updateSeatStatus(selectedSeat.id, newStatus, selectedSeat.version);

      // Update local state immediately for instant UI feedback
      dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: updatedSeat });

      // Close modal after success
      setIsModalOpen(false);

    } catch(err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update seat.';
      if (errorMessage.includes('Conflict')) {
          alert(errorMessage); // Give user specific feedback
          // Refetch data to get the latest state
          const seatsData = await api.getSeatsByRoom(roomId!);
          const otherSeats = allSeats.filter(s => s.roomId !== roomId);
          dispatch({ type: 'GET_SEATS_SUCCESS', payload: [...otherSeats, ...seatsData] });
      }
      dispatch({ type: 'API_REQUEST_FAIL', payload: errorMessage });
    } finally {
      setMarkingSeat(false);
      setSelectedSeat(null);
    }
  };

  const handleClaimSeat = async () => {
    if (!selectedSeat || isAdmin || selectedSeat.status !== SeatStatus.Available) return;

    setClaimingSeat(true);

    try {
        const updatedSeat = await api.claimSeat(selectedSeat.id, selectedSeat.version);
        dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: updatedSeat });
        setIsModalOpen(false); // Close modal on success
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to claim seat.';
        alert(errorMessage); // Show specific error to user
        if (errorMessage.includes('Conflict') || errorMessage.includes('no longer available')) {
            // Refetch data to get the latest state
            const seatsData = await api.getSeatsByRoom(roomId!);
            const otherSeats = allSeats.filter(s => s.roomId !== roomId);
            dispatch({ type: 'GET_SEATS_SUCCESS', payload: [...otherSeats, ...seatsData] });
        } else {
            dispatch({ type: 'API_REQUEST_FAIL', payload: errorMessage });
        }
    } finally {
        setClaimingSeat(false);
        setSelectedSeat(null);
    }
  };

  const selectedSeatStudent = useMemo(() => students.find(s => s.id === selectedSeat?.studentId), [students, selectedSeat]);
  const currentBuildingId = useMemo(() => currentRoom?.buildingId, [currentRoom]);

  if (loading && roomSeats.length === 0) return <Spinner />;

  return (
    <div>
      <button onClick={() => navigate(`/buildings/${currentBuildingId}/rooms`)} className="mb-6 text-primary hover:underline">&larr; Back to Rooms</button>
      <h1 className="text-3xl font-bold text-dark mb-2">Seat Map: {currentRoom?.name}</h1>
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 text-sm text-gray-600">
        <span className="flex items-center"><div className="w-4 h-4 rounded-full bg-green-100 mr-2 border-2 border-green-400"></div> Available</span>
        <span className="flex items-center"><div className="w-4 h-4 rounded-full bg-gray-200 mr-2 border-2 border-gray-500"></div> Filled</span>
        <span className="flex items-center"><div className="w-4 h-4 rounded-full bg-red-200 mr-2 border-2 border-red-500"></div> Broken/Unavailable</span>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg overflow-x-auto">
        {roomSeats.length > 0 ? (
          <div className="inline-grid gap-2" style={{ gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))` }}>
            {grid.map((row, rowIndex) =>
              row.map((seat, colIndex) => (
                seat ? (
                  <SeatComponent
                    key={seat.id}
                    seat={seat}
                    student={students.find(s => s.id === seat.studentId)}
                    onClick={() => handleSeatClick(seat)}
                    isClickable={true}
                  />
                ) : (
                  <div key={`empty-${rowIndex}-${colIndex}`} className="w-16 h-16" />
                )
              ))
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No seats have been configured for this room, or the room capacity is zero.</p>
        )}
      </div>

      <Modal isOpen={isModalOpen || markingSeat} onClose={() => setIsModalOpen(false)} title={`Seat Details: ${selectedSeat?.label}`} hideCloseButton={claimingSeat || markingSeat}>
        {selectedSeat && (
          <div>
            <p><strong>Status:</strong> <span className="capitalize font-semibold">{selectedSeat.status}</span></p>
            {selectedSeat.status === SeatStatus.Allocated && selectedSeatStudent && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                <p><strong>Allocated to:</strong> {selectedSeatStudent.name}</p>
                <p><strong>Email:</strong> {selectedSeatStudent.email}</p>
              </div>
            )}
             {state.error && <p className="text-sm text-danger mt-2">{state.error}</p>}
            
            {isAdmin && selectedSeat.status !== SeatStatus.Allocated && (
              <div className="mt-6">
                  <h3 className="font-semibold text-dark mb-2">Change Status</h3>
                  <div className="flex flex-col space-y-2">
                      {selectedSeat.status === SeatStatus.Available && (
                        <>
                          <Button variant="primary" onClick={() => handleStatusChange(SeatStatus.Allocated)} disabled={markingSeat}>
                            {markingSeat ? <Spinner /> : 'Mark as Filled'}
                          </Button>
                          <Button variant="danger" onClick={() => handleStatusChange(SeatStatus.Broken)} disabled={markingSeat}>
                            {markingSeat ? <Spinner /> : 'Mark as Broken'}
                          </Button>
                        </>
                      )}
                      {selectedSeat.status === SeatStatus.Broken && (
                        <>
                          <Button variant="secondary" onClick={() => handleStatusChange(SeatStatus.Available)} disabled={markingSeat}>
                            {markingSeat ? <Spinner /> : 'Mark as Available'}
                          </Button>
                          <Button variant="primary" onClick={() => handleStatusChange(SeatStatus.Allocated)} disabled={markingSeat}>
                            {markingSeat ? <Spinner /> : 'Mark as Filled'}
                          </Button>
                        </>
                      )}
                  </div>
              </div>
            )}
             {isAdmin && selectedSeat.status === SeatStatus.Allocated && (
                <p className="text-sm text-gray-600 mt-4">This seat is allocated. To make it available, run a new allocation plan or manually reassign the student.</p>
             )}
            {!isAdmin && (
                <div className="mt-4">
                    {selectedSeat.status === SeatStatus.Available && !currentUserHasSeatInRoom && (
                        <Button onClick={handleClaimSeat} disabled={claimingSeat}>
                            {claimingSeat ? 'Claiming...' : 'Claim This Seat'}
                        </Button>
                    )}
                    {selectedSeat.status === SeatStatus.Available && currentUserHasSeatInRoom && (
                        <p className="text-sm text-gray-600">You already have a seat in this room.</p>
                    )}
                    {selectedSeat.status === SeatStatus.Allocated && selectedSeat.studentId === studentForCurrentUser?.id && (
                         <p className="text-sm font-semibold text-green-700 p-2 bg-green-50 rounded-md">This is your currently assigned seat.</p>
                    )}
                    {selectedSeat.status === SeatStatus.Broken && (
                         <p className="text-sm text-yellow-700">This seat is currently unavailable.</p>
                    )}
                </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SeatMapPage;
