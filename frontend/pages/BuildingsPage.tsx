
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSeatPlanner } from '../context/SeatPlannerContext';
import { api } from '../services/apiService';
import { Card, Spinner } from '../components/ui';

const BuildingIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
    </svg>
);


const BuildingsPage: React.FC = () => {
  const { state, dispatch } = useSeatPlanner();
  const { buildings, rooms, loading, error } = state;

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'API_REQUEST_START' });
      try {
        const [buildingsData, roomsData] = await Promise.all([
            api.getBuildings(),
            api.getRoomsByBuilding('').then(() => api.getRoomsByBuilding('b1').then(() => api.getRoomsByBuilding('b2'))) // A trick to fetch all rooms
        ]);
        const allRooms = await api.getRoomsByBuilding('b1').then(r1 => api.getRoomsByBuilding('b2').then(r2 => [...r1, ...r2]));
        
        dispatch({ type: 'GET_BUILDINGS_SUCCESS', payload: buildingsData });
        dispatch({ type: 'GET_ROOMS_SUCCESS', payload: allRooms });

      } catch (err) {
        dispatch({ type: 'API_REQUEST_FAIL', payload: 'Failed to fetch buildings.' });
      }
    };
    if (buildings.length === 0) {
        fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getRoomCount = (buildingId: string) => {
    return rooms.filter(room => room.buildingId === buildingId).length;
  };

  if (loading && buildings.length === 0) return <Spinner />;
  if (error) return <p className="text-danger text-center">{error}</p>;
  if (buildings.length === 0) return <p className="text-gray-500 text-center">No buildings found.</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-dark mb-6">Buildings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {buildings.map((building) => (
          <Link to={`/buildings/${building.id}/rooms`} key={building.id}>
            <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="p-6 flex items-center space-x-6">
                <div className="flex-shrink-0">
                  <BuildingIcon/>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-dark">{building.name}</h2>
                  <p className="text-gray-500">{building.code}</p>
                  <p className="text-secondary font-semibold mt-2">{getRoomCount(building.id)} Rooms</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BuildingsPage;
