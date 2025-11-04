import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api } from '../services/apiService';
import { authService } from '../services/authService';
import { Spinner, Modal, Button } from '../components/ui';
import { Seat, SeatStatus, Student, Room, Branch, AllocationSummary } from '../types';
import io from 'socket.io-client';

const BRANCHES = [
    { id: Branch.ConsultingClub, label: "Consulting Club" },
    { id: Branch.InvestmentBankingClub, label: "Investment Banking Club" },
    { id: Branch.TechAndInnovationClub, label: "Tech & Innovation Club" },
    { id: Branch.EntrepreneurshipCell, label: "Entrepreneurship Cell" },
    { id: Branch.SustainabilityAndCSRClub, label: "Sustainability & CSR Club" },
    { id: Branch.WomenInBusiness, label: "Women in Business" },
    { id: Branch.HealthcareManagementClub, label: "Healthcare Management Club" },
    { id: Branch.RealEstateClub, label: "Real Estate Club" },
];

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

const SeatComponent: React.FC<{ seat: Seat; student?: Student; onClick: () => void; isClickable: boolean; }> = ({ seat, student, onClick, isClickable }) => {
  const isAdmin = authService.isAdmin();
  const getStatusClasses = (status: SeatStatus) => {
    switch (status) {
      case SeatStatus.Available: return 'bg-green-100 border-green-400 hover:bg-green-200 text-green-800';
      case SeatStatus.Allocated: return 'bg-gray-200 border-gray-500 hover:bg-gray-300 text-gray-800';
      case SeatStatus.Broken: return 'bg-red-200 border-red-500 hover:bg-red-300 text-red-800';
      default: return 'bg-yellow-100 border-yellow-400 text-yellow-800';
    }
  };
  const cursorClass = isClickable ? 'cursor-pointer' : 'cursor-default';
  const title = useMemo(() => {
    if (seat.status === SeatStatus.Allocated) {
        return isAdmin ? `Allocated to: ${student?.name || 'a student'}` : 'Allocated';
    }
    if(seat.features.length > 0) {
        return `Features: ${seat.features.join(', ')}`;
    }
    return seat.label;
  }, [seat, student, isAdmin]);

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`w-12 h-12 rounded-lg border-2 flex flex-col justify-center items-center transition-all relative ${getStatusClasses(seat.status)} ${cursorClass}`}
      title={title}
    >
      <span className="text-sm font-bold">{seat.label}</span>
      {seat.status === SeatStatus.Allocated && ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600 mt-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>)}
      {seat.status === SeatStatus.Broken && (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 mt-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>)}
         </div>
  );
};

const AllocationModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    buildingId: string | undefined
}> = ({ isOpen, onClose, buildingId }) => {
    const [eligibleBranches, setEligibleBranches] = useState<{id: Branch, label: string}[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<Branch | ''>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<AllocationSummary | null>(null);

    useEffect(() => {
        if (isOpen && buildingId) {
            setLoading(true);
            setError('');
            api.getEligibleBranches(buildingId)
                .then(branches => {
                    const branchOptions = branches.map(branchId => ({
                        id: branchId,
                        label: BRANCHES.find(b => b.id === branchId)?.label || branchId
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
        if (!buildingId || !selectedBranch) {
            setError("Cannot determine the building or no branch selected.");
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const response = await api.allocateBranchToBuilding(selectedBranch, buildingId);
            setResult(response.summary);
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
        <Modal isOpen={isOpen} onClose={closeModal} title="Allocate Branch to Building">
            {!result ? (
            <div>
                <p className="mb-4 text-sm text-gray-600">Select a branch to allocate all of its students to available seats within this building.</p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="branch" className="block text-sm font-medium text-gray-700">Club / Branch</label>
                        <select id="branch" name="branch" className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value as Branch)} disabled={loading || eligibleBranches.length === 0}>
                            {loading && <option>Loading branches...</option>}
                            {!loading && eligibleBranches.length === 0 && <option>No eligible branches found</option>}
                            {eligibleBranches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                        </select>
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                <div className="mt-6 flex justify-end">
                    <Button onClick={handleAllocate} disabled={loading || !selectedBranch}>{loading ? 'Allocating...' : 'Run Allocation'}</Button>
                </div>
            </div>
            ) : (
            <div>
                <h3 className="font-bold text-lg text-green-700 mb-2">Allocation Complete!</h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold text-accent">{result.allocatedCount}</p>
                        <p className="text-sm text-gray-500">Students Allocated</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-danger">{result.unallocatedCount}</p>
                        <p className="text-sm text-gray-500">Students Unallocated</p>
                    </div>
                </div>
                 {result.unallocatedCount > 0 && (
                    <div className="mt-4">
                        <h4 className="font-semibold text-dark mb-2">Unallocated Students:</h4>
                        <ul className="list-disc list-inside bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                            {result.unallocatedStudents.map(({ student, reason }) => (
                                <li key={student.id} className="text-sm">{student.name} - <span className="text-gray-600">{reason}</span></li>
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


const SeatMapPage: React.FC = () => {
    const { roomId } = useParams<{ roomId: string }>();
    const navigate = useNavigate();
    const { state, dispatch } = useSeatPlanner();
    const { seats: allSeats, students, loading } = state;
    const isAdmin = authService.isAdmin();
  
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [roomsInBuilding, setRoomsInBuilding] = useState<Room[]>([]);
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');
    const [editingFeatures, setEditingFeatures] = useState<string[]>([]);
  
    const roomSeats = useMemo(() => allSeats.filter(s => s.roomId === roomId), [allSeats, roomId]);
    
    const isBuildingFullyAllocated = useMemo(() => {
        if (roomsInBuilding.length === 0) return false;
        return roomsInBuilding.every(room => room.branchAllocated !== null);
    }, [roomsInBuilding]);

    const seatColumns = useMemo(() => {
        if (!currentRoom || roomSeats.length === 0) return [];
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
          dispatch({ type: 'GET_SEATS_SUCCESS', payload: seatsData });

          if (roomData.buildingId) {
            const allRoomsData = await api.getRoomsByBuilding(roomData.buildingId);
            setRoomsInBuilding(allRoomsData);
          }
        } catch (err) { dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to fetch seat map.' }); }
      };
      fetchData();
  
      const socketUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace('/api', '');
      const socket = io(socketUrl);
      socket.on('seatUpdated', (updatedSeat: Seat) => { if (updatedSeat.roomId === roomId) dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: updatedSeat }); });
      socket.on('allocationsUpdated', fetchData); // Refetch data on broad allocation changes
      return () => socket.disconnect();
    }, [roomId, dispatch]);
  
    const handleSeatClick = (seat: Seat) => {
      if (!isAdmin) return;
      setSelectedSeat(seat);
      setModalError('');
      setEditingFeatures(seat.features.filter(f => !STUDENT_ACCESSIBILITY_NEEDS.map(n=>n.id).includes(f)));
      setIsEditModalOpen(true);
    };
    
    const handleUpdateStatus = async (status: SeatStatus) => {
      if (!selectedSeat || !isAdmin) return;
      setIsSubmitting(true);
      setModalError('');
      try {
          await api.updateSeatStatus(selectedSeat.id, status, selectedSeat.version);
          setIsEditModalOpen(false);
      } catch (err) { setModalError((err as Error).message); } finally { setIsSubmitting(false); }
    };
  
    const handleSaveFeatures = async () => {
      if (!selectedSeat || !isAdmin) return;
      setIsSubmitting(true);
      setModalError('');
      try {
          await api.updateSeatFeatures(selectedSeat.id, editingFeatures, selectedSeat.version);
          setIsEditModalOpen(false);
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
                  {currentRoom?.branchAllocated && <span className="font-semibold text-primary">Allocated to: {BRANCHES.find(b => b.id === currentRoom.branchAllocated)?.label}</span>}
              </div>
          </div>
          {isAdmin && !isBuildingFullyAllocated && (
              <Button onClick={() => setIsAllocationModalOpen(true)}>Allocate Branch to Building</Button>
          )}
        </div>

        {seatColumns.length > 0 ? (
          (() => {
            const totalColumns = seatColumns.length;
            const containerWidth = Math.min(100, totalColumns * 8); // Approximate width based on seat size + gaps
            const containerHeight = Math.min(100, seatColumns[0]?.length * 8 || 50); // Approximate height based on rows
            return (
              <div className="flex justify-center">
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg overflow-hidden" style={{ width: `${containerWidth}%`, height: `${containerHeight}vh` }}>
                  <div className="flex w-full h-full">
                    {seatColumns.map((column, colIndex) => (
                        <div key={colIndex} className={`flex-1 flex flex-col gap-1 ${colIndex > 0 && colIndex % 3 === 0 ? 'ml-3' : ''}`}>
                            {column.map((rowIndex, seatIndex) => (
                                column[seatIndex] ? ( <SeatComponent key={column[seatIndex]!.id} seat={column[seatIndex]!} student={students.find(s => s.id === column[seatIndex]!.studentId)} onClick={() => handleSeatClick(column[seatIndex]!)} isClickable={isAdmin} /> ) : <div key={`empty-${colIndex}-${seatIndex}`} className="w-12 h-12" />
                            ))}
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()
        ) : <p className="text-center text-gray-500 py-8">No seats found for this room.</p>}
  
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit Seat: ${selectedSeat?.label}`}>
            {selectedSeat && (  <div>
                <p><strong>Current Status:</strong> {selectedSeat.status}</p>
                {selectedSeatStudent && <p><strong>Allocated To:</strong> {selectedSeatStudent.name}</p>}
                
                <div className="mt-4 border-t pt-4">
                  <h3 className="font-semibold text-dark mb-2">Update Status</h3>
                   <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => handleUpdateStatus(SeatStatus.Available)} disabled={isSubmitting || selectedSeat.status === 'Available'}>Available</Button>
                        <Button variant="secondary" onClick={() => handleUpdateStatus(SeatStatus.Allocated)} disabled={isSubmitting || selectedSeat.status === 'Allocated'}>Filled</Button>
                        <Button variant="danger" onClick={() => handleUpdateStatus(SeatStatus.Broken)} disabled={isSubmitting || selectedSeat.status === 'Broken'}>Broken</Button>
                   </div>
                </div>

                <div className="mt-4 border-t pt-4">
                    <h3 className="font-semibold text-dark mb-2">Manage Custom Features</h3>
                    <div className="space-y-2">
                        {OTHER_FEATURES.map(feature => (
                            <label key={feature.id} className="flex items-center">
                                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" checked={editingFeatures.includes(feature.id)} onChange={() => setEditingFeatures(prev => prev.includes(feature.id) ? prev.filter(f => f !== feature.id) : [...prev, feature.id])} />
                                <span className="ml-2 text-sm text-gray-700">{feature.label}</span>
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Positional features (front row, aisle, etc.) are automatically assigned.</p>
                    <div className="mt-4 flex justify-end"> <Button onClick={handleSaveFeatures} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Features'}</Button> </div>
                </div>

                {modalError && <p className="text-red-600 text-sm mt-4 text-center">{modalError}</p>}
            </div>
          )}
        </Modal>
        
        <AllocationModal isOpen={isAllocationModalOpen} onClose={() => setIsAllocationModalOpen(false)} buildingId={currentRoom?.buildingId} />
      </div>
    );
  };
  
  export default SeatMapPage;
