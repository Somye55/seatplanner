import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api, ConflictError } from '../services/apiService';
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
      className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-md sm:rounded-lg border-2 flex flex-col justify-center items-center transition-all relative ${getStatusClasses(seat.status)} ${cursorClass}`}
      title={title}
    >
      <span className="text-xs sm:text-sm font-bold">{seat.label}</span>
      {seat.status === SeatStatus.Allocated && ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-gray-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>)}
      {seat.status === SeatStatus.Broken && (<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-red-600 mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>)}
         </div>
  );
};

const AllocationModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    buildingId: string | undefined,
    roomId?: string,
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
        if (!selectedBranch) {
            setError("No branch selected.");
            return;
        }
        if (roomId && !buildingId) {
            setError("Cannot determine the building for room allocation.");
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const response = roomId
                ? await api.allocateBranchToRoom(selectedBranch, roomId)
                : await api.allocateBranchToBuilding(selectedBranch, buildingId!);
            setResult(response.summary);
            // Trigger data refresh
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

    const title = roomId ? "Allocate Branch to Room" : "Allocate Branch to Building";
    const description = roomId
        ? "Select a branch to allocate all of its unallocated students to available seats within this room."
        : "Select a branch to allocate all of its unallocated students to available seats within this building.";

    return (
        <Modal isOpen={isOpen} onClose={closeModal} title={title}>
            {!result ? (
            <div>
                <p className="mb-4 text-sm text-gray-600">{description}</p>
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
                        {result.availableSeatsAfterAllocation !== undefined && (
                            <div className="bg-white p-3 rounded-md shadow-sm">
                                <p className="text-3xl font-bold text-secondary">{result.availableSeatsAfterAllocation}</p>
                                <p className="text-sm text-gray-600 mt-1">Available Seats</p>
                            </div>
                        )}
                        {result.branchAllocated && (
                            <div className="bg-white p-3 rounded-md shadow-sm">
                                <p className="text-lg font-bold text-primary mt-2">{BRANCHES.find(b => b.id === result.branchAllocated)?.label || result.branchAllocated}</p>
                                <p className="text-sm text-gray-600 mt-1">Branch Allocated</p>
                            </div>
                        )}
                    </div>
                    {result.affectedRoomIds && result.affectedRoomIds.length > 0 && (
                        <div className="text-center text-sm text-gray-600">
                            <p>Affected {result.affectedRoomIds.length} room{result.affectedRoomIds.length !== 1 ? 's' : ''} in this {roomId ? 'room' : 'building'}</p>
                        </div>
                    )}
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
    const [isRoomAllocationModalOpen, setIsRoomAllocationModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState('');
    const [editingFeatures, setEditingFeatures] = useState<string[]>([]);
    const [dataLoaded, setDataLoaded] = useState(false);
  
    const roomSeats = useMemo(() => allSeats.filter(s => s.roomId === roomId), [allSeats, roomId]);
    
    const seatStats = useMemo(() => {
        const total = roomSeats.length;
        const filled = roomSeats.filter(s => s.status === SeatStatus.Allocated).length;
        const broken = roomSeats.filter(s => s.status === SeatStatus.Broken).length;
        const available = roomSeats.filter(s => s.status === SeatStatus.Available).length;
        return { total, filled, broken, available };
    }, [roomSeats]);
    
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
        setDataLoaded(true);
      } catch (err) { 
        dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to fetch seat map.' }); 
        setDataLoaded(true);
      }
    };
  
    useEffect(() => {
      fetchData();
  
      const socketUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace('/api', '');
      const socket = io(socketUrl);
      socket.on('seatUpdated', (updatedSeat: Seat) => { 
        if (updatedSeat.roomId === roomId) {
          dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: updatedSeat });
          // ✅ If this is the currently selected seat, update it too
          setSelectedSeat(prev => prev?.id === updatedSeat.id ? updatedSeat : prev);
        }
      });
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
      } catch (err) {
          if (err instanceof ConflictError && err.currentData) {
              // Update global state with current seat data from 409 response
              dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: err.currentData });
              // ✅ CRITICAL: Also update selectedSeat so modal has the new version
              setSelectedSeat(err.currentData);
              setModalError('This seat was just modified by another admin. Your view has been updated. Please try again.');
          } else {
              setModalError((err as Error).message);
          }
      } finally { 
          setIsSubmitting(false); 
      }
    };
  
    const handleSaveFeatures = async () => {
      if (!selectedSeat || !isAdmin) return;
      setIsSubmitting(true);
      setModalError('');
      try {
          await api.updateSeatFeatures(selectedSeat.id, editingFeatures, selectedSeat.version);
          setIsEditModalOpen(false);
      } catch (err) {
          if (err instanceof ConflictError && err.currentData) {
              // Update global state with current seat data from 409 response
              dispatch({ type: 'UPDATE_SEAT_SUCCESS', payload: err.currentData });
              // ✅ CRITICAL: Also update selectedSeat so modal has the new version
              setSelectedSeat(err.currentData);
              setModalError('This seat was just modified by another admin. Your view has been updated. Please try again.');
          } else {
              setModalError((err as Error).message);
          }
      } finally { 
          setIsSubmitting(false); 
      }
    };
  
    const selectedSeatStudent = useMemo(() => students.find(s => s.id === selectedSeat?.studentId), [students, selectedSeat]);
  
    if (loading && roomSeats.length === 0) return <Spinner />;
  
    return (
      <div>
        <button onClick={() => navigate(`/buildings/${currentRoom?.buildingId}/rooms`)} className="mb-6 text-primary hover:underline">&larr; Back to Rooms</button>
        <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
          <div>
              <h1 className="text-3xl font-bold text-dark mb-2">Seat Map: {currentRoom?.name}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 mb-3">
                  <span className="flex items-center"><div className="w-4 h-4 rounded-full bg-green-100 mr-2 border-2 border-green-400"></div> Available</span>
                  <span className="flex items-center"><div className="w-4 h-4 rounded-full bg-gray-200 mr-2 border-2 border-gray-500"></div> Filled</span>
                  <span className="flex items-center"><div className="w-4 h-4 rounded-full bg-red-200 mr-2 border-2 border-red-500"></div> Broken</span>
                  {currentRoom?.branchAllocated && <span className="font-semibold text-primary">Allocated to: {BRANCHES.find(b => b.id === currentRoom.branchAllocated)?.label}</span>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
                  <span className="text-gray-700">Total Seats: {seatStats.total}</span>
                  <span className="text-gray-600">Filled: {seatStats.filled}</span>
                  <span className="text-red-600">Broken: {seatStats.broken}</span>
                  <span className="text-green-600">Available: {seatStats.available}</span>
              </div>
          </div>
          {isAdmin && !isBuildingFullyAllocated && (
              <Button onClick={() => setIsAllocationModalOpen(true)}>Allocate Branch to Building</Button>
          )}
          {isAdmin && dataLoaded && currentRoom && !currentRoom.branchAllocated && (
              <Button onClick={() => setIsRoomAllocationModalOpen(true)}>Allocate Branch to Room</Button>
          )}
        </div>

        {seatColumns.length > 0 ? (
          <div className="flex justify-center w-full">
            <div className="bg-white p-2 sm:p-4 md:p-6 rounded-lg shadow-lg overflow-auto w-full max-w-full">
              <div className="flex gap-0.5 sm:gap-1 md:gap-1.5 justify-center min-w-min">
                {seatColumns.map((column, colIndex) => (
                  <div key={colIndex} className={`flex flex-col gap-0.5 sm:gap-1 md:gap-1.5 ${colIndex > 0 && colIndex % 3 === 0 ? 'ml-1 sm:ml-2 md:ml-3' : ''}`}>
                    {column.map((rowIndex, seatIndex) => (
                      column[seatIndex] ? ( 
                        <SeatComponent 
                          key={column[seatIndex]!.id} 
                          seat={column[seatIndex]!} 
                          student={students.find(s => s.id === column[seatIndex]!.studentId)} 
                          onClick={() => handleSeatClick(column[seatIndex]!)} 
                          isClickable={isAdmin} 
                        /> 
                      ) : (
                        <div key={`empty-${colIndex}-${seatIndex}`} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14" />
                      )
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
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
        
        <AllocationModal 
          isOpen={isAllocationModalOpen} 
          onClose={() => setIsAllocationModalOpen(false)} 
          buildingId={currentRoom?.buildingId} 
          onAllocationComplete={fetchData}
        />
        <AllocationModal 
          isOpen={isRoomAllocationModalOpen} 
          onClose={() => setIsRoomAllocationModalOpen(false)} 
          buildingId={currentRoom?.buildingId} 
          roomId={roomId}
          onAllocationComplete={fetchData}
        />
      </div>
    );
  };
  
  export default SeatMapPage;
