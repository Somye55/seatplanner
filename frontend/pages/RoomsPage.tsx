
import React, { useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api } from '../services/apiService';
import { Card, Spinner } from '../components/ui';
import { SeatStatus } from '../types';

const RoomsPage: React.FC = () => {
  const { buildingId } = useParams<{ buildingId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useSeatPlanner();
  const { rooms, seats, buildings, loading, error } = state;

  const building = useMemo(() => buildings.find(b => b.id === buildingId), [buildings, buildingId]);
  const buildingRooms = useMemo(() => rooms.filter(r => r.buildingId === buildingId), [rooms, buildingId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!buildingId) return;
      dispatch({ type: 'API_REQUEST_START' });
      try {
        const [roomsData, allSeats] = await Promise.all([
          api.getRoomsByBuilding(buildingId),
          Promise.all(rooms.map(r => api.getSeatsByRoom(r.id))).then(res => res.flat())
        ]);
        
        if (state.buildings.length === 0) {
            const buildingsData = await api.getBuildings();
            dispatch({type: 'GET_BUILDINGS_SUCCESS', payload: buildingsData});
        }

        dispatch({ type: 'GET_ROOMS_SUCCESS', payload: [...rooms.filter(r => r.buildingId !== buildingId), ...roomsData] });
        dispatch({ type: 'GET_SEATS_SUCCESS', payload: allSeats });
      } catch (err) {
        dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to fetch rooms.' });
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId]);

  const getAvailableSeats = (roomId: string) => {
    return seats.filter(seat => seat.roomId === roomId && seat.status === SeatStatus.Available).length;
  };
  
  if (loading && buildingRooms.length === 0) return <Spinner />;
  if (error) return <p className="text-danger text-center">{error}</p>;

  return (
    <div>
      <button onClick={() => navigate('/buildings')} className="mb-6 text-primary hover:underline">&larr; Back to Buildings</button>
      <h1 className="text-3xl font-bold text-dark mb-6">Rooms in {building?.name || '...'}</h1>
      
      {buildingRooms.length === 0 ? (
          <p className="text-gray-500 text-center mt-8">No rooms found in this building.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buildingRooms.map((room) => (
            <Link to={`/rooms/${room.id}`} key={room.id}>
              <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-dark">{room.name}</h2>
                  <p className="text-gray-500">Capacity: {room.capacity}</p>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-accent font-bold text-lg">{getAvailableSeats(room.id)} seats available</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoomsPage;
