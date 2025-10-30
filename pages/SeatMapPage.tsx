
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api } from '../services/apiService';
import { Spinner, Modal, Button } from '../components/ui';
import { Seat, SeatStatus, Student, Room } from '../types';

const SeatComponent: React.FC<{ seat: Seat; student?: Student; onClick: () => void; }> = ({ seat, student, onClick }) => {
  const statusClasses: Record<SeatStatus, string> = {
    [SeatStatus.Available]: 'bg-green-100 border-green-400 hover:bg-green-200',
    [SeatStatus.Allocated]: 'bg-blue-200 border-blue-500 hover:bg-blue-300',
    [SeatStatus.Broken]: 'bg-red-200 border-red-500 hover:bg-red-300 cursor-not-allowed',
  };

  return (
    <div
      onClick={onClick}
      className={`w-16 h-16 m-1 rounded-lg border-2 flex flex-col justify-center items-center cursor-pointer transition-all ${statusClasses[seat.status]}`}
      title={seat.status === SeatStatus.Allocated ? `Allocated to: ${student?.name}` : seat.status}
    >
      <span className="text-xs font-bold text-gray-700">{seat.label}</span>
      {seat.status === SeatStatus.Allocated && (
         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-800" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      )}
       {seat.status === SeatStatus.Broken && (
         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-800" viewBox="0 0 20 20" fill="currentColor">
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

  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const roomSeats = useMemo(() => allSeats.filter(s => s.roomId === roomId).sort((a, b) => a.row - b.row || a.col - b.col), [allSeats, roomId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!roomId) return;
      dispatch({ type: 'API_REQUEST_START' });
      try {
        const [roomData, seatsData, studentsData] = await Promise.all([
          api.getRoomById(roomId),
          api.getSeatsByRoom(roomId),
          state.students.length > 0 ? Promise.resolve(state.students) : api.getStudents()
        ]);
        if (!roomData) throw new Error("Room not found");
        
        setCurrentRoom(roomData);
        dispatch({ type: 'GET_SEATS_SUCCESS', payload: [...allSeats.filter(s => s.roomId !== roomId), ...seatsData] });
        if (state.students.length === 0) dispatch({ type: 'GET_STUDENTS_SUCCESS', payload: studentsData });
      } catch (err) {
        dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to fetch seat map.' });
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, dispatch]);

  const gridTemplateColumns = useMemo(() => {
    if (roomSeats.length === 0) return 'none';
    const maxCols = Math.max(...roomSeats.map(s => s.col)) + 1;
    return `repeat(${maxCols}, minmax(0, 1fr))`;
  }, [roomSeats]);

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);
    setIsModalOpen(true);
  };
  
  const handleStatusChange = async (newStatus: SeatStatus) => {
    if (!selectedSeat) return;
    dispatch({ type: 'API_REQUEST_START' });
    try {
      const updatedSeat = await api.updateSeatStatus(selectedSeat.id, newStatus);
      dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: updatedSeat });
    } catch(err) {
      dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to update seat.' });
    } finally {
      setIsModalOpen(false);
      setSelectedSeat(null);
    }
  };

  const selectedSeatStudent = useMemo(() => students.find(s => s.id === selectedSeat?.studentId), [students, selectedSeat]);
  const currentBuildingId = useMemo(() => rooms.find(r => r.id === roomId)?.buildingId, [rooms, roomId]);

  if (loading && roomSeats.length === 0) return <Spinner />;

  return (
    <div>
      <button onClick={() => navigate(`/buildings/${currentBuildingId}/rooms`)} className="mb-6 text-primary hover:underline">&larr; Back to Rooms</button>
      <h1 className="text-3xl font-bold text-dark mb-2">Seat Map: {currentRoom?.name}</h1>
      <div className="flex space-x-4 mb-6 text-sm text-gray-600">
        <span className="flex items-center"><div className="w-4 h-4 rounded-full bg-green-200 mr-2 border-2 border-green-400"></div> Available</span>
        <span className="flex items-center"><div className="w-4 h-4 rounded-full bg-blue-200 mr-2 border-2 border-blue-500"></div> Allocated</span>
        <span className="flex items-center"><div className="w-4 h-4 rounded-full bg-red-200 mr-2 border-2 border-red-500"></div> Broken</span>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns }}>
          {roomSeats.map(seat => (
            <SeatComponent 
              key={seat.id} 
              seat={seat} 
              student={students.find(s => s.id === seat.studentId)}
              onClick={() => handleSeatClick(seat)} />
          ))}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Seat Details: ${selectedSeat?.label}`}>
        {selectedSeat && (
          <div>
            <p><strong>Status:</strong> <span className="capitalize">{selectedSeat.status}</span></p>
            {selectedSeat.status === SeatStatus.Allocated && selectedSeatStudent && (
              <div className="mt-2">
                <p><strong>Allocated to:</strong> {selectedSeatStudent.name}</p>
                <p><strong>Email:</strong> {selectedSeatStudent.email}</p>
              </div>
            )}
            <div className="mt-6 flex flex-col space-y-2">
                <h3 className="font-semibold">Actions</h3>
                {selectedSeat.status !== SeatStatus.Available && 
                    <Button variant="secondary" onClick={() => handleStatusChange(SeatStatus.Available)}>Mark as Available</Button>}
                {selectedSeat.status !== SeatStatus.Broken && 
                    <Button variant="danger" onClick={() => handleStatusChange(SeatStatus.Broken)}>Mark as Broken</Button>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SeatMapPage;
