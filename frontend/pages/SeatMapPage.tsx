import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api } from '../services/apiService';
import { authService } from '../services/authService';
import { Spinner, Modal, Button } from '../components/ui';
import { Seat, SeatStatus, Student, Room } from '../types';
import io from 'socket.io-client';

const STUDENT_ACCESSIBILITY_NEEDS = [
    { id: 'front_row', label: 'Front Row' },
    { id: 'back_row', label: 'Back Row' },
    { id: 'aisle_seat', label: 'Aisle Seat' },
    { id: 'middle_column_seat', label: 'Middle of a Row' },
];
const OTHER_FEATURES = [
    { id: 'wheelchair_access', label: 'Wheelchair Access' },
    { id: 'near_exit', label: 'Near Exit' },
];
const ALL_FEATURES = [...STUDENT_ACCESSIBILITY_NEEDS, ...OTHER_FEATURES];

const FeatureIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute top-1 right-1 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const SeatComponent: React.FC<{ seat: Seat; student?: Student; onClick: () => void; isClickable: boolean; }> = ({ seat, student, onClick, isClickable }) => {
  const getStatusClasses = (status: SeatStatus) => {
    switch (status) {
      case SeatStatus.Available: return 'bg-green-100 border-green-400 hover:bg-green-200 text-green-800';
      case SeatStatus.Allocated: return 'bg-gray-200 border-gray-500 hover:bg-gray-300 text-gray-800';
      case SeatStatus.Broken: return 'bg-red-200 border-red-500 hover:bg-red-300 text-red-800';
      default: return 'bg-yellow-100 border-yellow-400 text-yellow-800';
    }
  };
  const customFeatures = seat.features.filter(f => !STUDENT_ACCESSIBILITY_NEEDS.map(n=>n.id).includes(f));
  const cursorClass = isClickable ? 'cursor-pointer' : 'cursor-default';

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`w-16 h-16 rounded-lg border-2 flex flex-col justify-center items-center transition-all relative ${getStatusClasses(seat.status)} ${cursorClass}`}
      title={seat.status === SeatStatus.Allocated ? `Allocated to: ${student?.name}` : `Features: ${seat.features.join(', ')}`}
    >
      {customFeatures.length > 0 && <FeatureIcon />}
      <span className="text-sm font-bold">{seat.label}</span>
      {seat.status === SeatStatus.Allocated && ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 mt-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>)}
      {seat.status === SeatStatus.Broken && (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 mt-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>)}
    </div>
  );
};

const SeatMapPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useSeatPlanner();
  const { seats: allSeats, students, loading } = state;
  const isAdmin = authService.isAdmin();
  const currentUser = authService.getUser();

  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  
  const [editingFeatures, setEditingFeatures] = useState<string[]>([]);
  const [requestedNeeds, setRequestedNeeds] = useState<string[]>([]);

  const roomSeats = useMemo(() => allSeats.filter(s => s.roomId === roomId), [allSeats, roomId]);
  const studentForCurrentUser = useMemo(() => students.find(s => s.email === currentUser?.email), [students, currentUser]);
  const currentUserHasSeatInRoom = useMemo(() => roomSeats.some(s => s.studentId === studentForCurrentUser?.id), [roomSeats, studentForCurrentUser]);

  const seatColumns = useMemo(() => {
    if (!currentRoom || roomSeats.length === 0) return [];
    // Calculate rows and cols from seats if room has 0 values
    const actualRows = currentRoom.rows || Math.max(...roomSeats.map(s => s.row)) + 1;
    const actualCols = currentRoom.cols || Math.max(...roomSeats.map(s => s.col)) + 1;
    const columns: (Seat | null)[][] = Array.from({ length: actualCols }, () => Array(actualRows).fill(null));
    roomSeats.forEach(seat => {
      if (seat.col < actualCols && seat.row < actualRows) {
          columns[seat.col][seat.row] = seat;
      }
    });
    return columns;
  }, [roomSeats, currentRoom]);


  useEffect(() => {
    const fetchData = async () => {
      if (!roomId) return;
      dispatch({ type: 'API_REQUEST_START' });
      try {
        const [roomData, seatsData] = await Promise.all([api.getRoomById(roomId), api.getSeatsByRoom(roomId)]);
        setCurrentRoom(roomData);
        dispatch({ type: 'GET_SEATS_SUCCESS', payload: [...allSeats.filter(s => s.roomId !== roomId), ...seatsData] });
      } catch (err) { dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to fetch seat map.' }); }
    };
    fetchData();

    const socketUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace('/api', '');
    const socket = io(socketUrl);
    socket.on('seatUpdated', (updatedSeat: Seat) => { if (updatedSeat.roomId === roomId) dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: updatedSeat }); });
    socket.on('seatsUpdated', (allUpdatedSeats: Seat[]) => dispatch({ type: 'GET_SEATS_SUCCESS', payload: allUpdatedSeats }));
    return () => socket.disconnect();
  }, [roomId, dispatch]);

  const handleSeatClick = (seat: Seat) => {
    if (!isAdmin) return;
    setSelectedSeat(seat);
    setModalError('');
    setEditingFeatures(seat.features);
    setIsModalOpen(true);
  };
  
  const handleFindAndClaim = async () => {
    if (!roomId || isAdmin) return;
    setIsSubmitting(true);
    setModalError('');
    try {
        const claimedSeat = await api.findAndClaimSeat(roomId, requestedNeeds);
        alert(`Success! You have been assigned seat ${claimedSeat.label}.`);
        setIsModalOpen(false);
    } catch (err) { setModalError((err as Error).message); } finally { setIsSubmitting(false); }
  };

  const handleSaveFeatures = async () => {
    if (!selectedSeat || !isAdmin) return;
    setIsSubmitting(true);
    setModalError('');
    try {
        await api.updateSeatFeatures(selectedSeat.id, editingFeatures, selectedSeat.version);
        setIsModalOpen(false);
    } catch (err) { setModalError((err as Error).message); } finally { setIsSubmitting(false); }
  };

  const selectedSeatStudent = useMemo(() => students.find(s => s.id === selectedSeat?.studentId), [students, selectedSeat]);

  if (loading && roomSeats.length === 0) return <Spinner />;

  return (
    <div>
      <button onClick={() => navigate(`/buildings/${currentRoom?.buildingId}/rooms`)} className="mb-6 text-primary hover:underline">&larr; Back to Rooms</button>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div>
            <h1 className="text-3xl font-bold text-dark mb-2">Seat Map: {currentRoom?.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
                <span className="flex items-center"><div className="w-4 h-4 rounded-full bg-green-100 mr-2 border-2 border-green-400"></div> Available</span>
                <span className="flex items-center"><div className="w-4 h-4 rounded-full bg-gray-200 mr-2 border-2 border-gray-500"></div> Filled</span>
                <span className="flex items-center"><div className="w-4 h-4 rounded-full bg-red-200 mr-2 border-2 border-red-500"></div> Broken</span>
                <span className="flex items-center"><FeatureIcon /> <span className="ml-1">= Custom Feature</span></span>
            </div>
        </div>
        {!isAdmin && (
            <Button onClick={() => setIsModalOpen(true)} disabled={currentUserHasSeatInRoom}>
                {currentUserHasSeatInRoom ? 'Seat Claimed' : 'Find a Seat For Me'}
            </Button>
        )}
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg overflow-x-auto">
        {seatColumns.length > 0 ? (
          <div className="flex gap-2">
            {seatColumns.map((column, colIndex) => (
                <div key={colIndex} className={`flex flex-col gap-2 ${colIndex > 0 && colIndex % 3 === 0 ? 'ml-6' : ''}`}>
                    {column.map((seat, rowIndex) => (
                        seat ? (
                            <SeatComponent
                                key={seat.id}
                                seat={seat}
                                student={students.find(s => s.id === seat.studentId)}
                                onClick={() => handleSeatClick(seat)}
                                isClickable={isAdmin}
                            />
                        ) : <div key={`empty-${colIndex}-${rowIndex}`} className="w-16 h-16" />
                    ))}
                </div>
            ))}
        </div>
        ) : <p className="text-center text-gray-500 py-8">No seats found for this room.</p>}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={isAdmin ? `Edit Seat: ${selectedSeat?.label}` : `Request a Seat`}>
          <div>
            {!isAdmin ? (
                <div>
                    <p className="text-sm text-gray-600 mb-4">Select any accessibility needs. The system will find the best available seat for you.</p>
                    <div className="space-y-2">
                        {STUDENT_ACCESSIBILITY_NEEDS.map(need => (
                            <label key={need.id} className="flex items-center">
                                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    checked={requestedNeeds.includes(need.id)}
                                    onChange={() => setRequestedNeeds(prev => prev.includes(need.id) ? prev.filter(n => n !== need.id) : [...prev, need.id])}
                                />
                                <span className="ml-2 text-sm text-gray-700">{need.label}</span>
                            </label>
                        ))}
                    </div>
                    {modalError && <p className="text-red-600 text-sm mt-4">{modalError}</p>}
                    <div className="mt-6 flex justify-end"> <Button onClick={handleFindAndClaim} disabled={isSubmitting}>{isSubmitting ? 'Searching...' : 'Find and Claim Seat'}</Button> </div>
                </div>
            ) : ( selectedSeat &&
                <div>
                    <p><strong>Status:</strong> {selectedSeat.status}</p>
                    {selectedSeatStudent && <p><strong>Allocated To:</strong> {selectedSeatStudent.name}</p>}
                    <div className="mt-4 border-t pt-4">
                        <h3 className="font-semibold text-dark mb-2">Manage Custom Features</h3>
                        <div className="space-y-2">
                           {OTHER_FEATURES.map(feature => (
                               <label key={feature.id} className="flex items-center">
                                   <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                       checked={editingFeatures.includes(feature.id)}
                                       onChange={() => setEditingFeatures(prev => prev.includes(feature.id) ? prev.filter(f => f !== feature.id) : [...prev, feature.id])}
                                   />
                                   <span className="ml-2 text-sm text-gray-700">{feature.label}</span>
                               </label>
                           ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Positional features (front row, aisle, etc.) are automatically assigned.</p>
                        {modalError && <p className="text-red-600 text-sm mt-4">{modalError}</p>}
                        <div className="mt-4 flex justify-end"> <Button onClick={handleSaveFeatures} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Features'}</Button> </div>
                    </div>
                </div>
            )}
          </div>
      </Modal>
    </div>
  );
};

export default SeatMapPage;
