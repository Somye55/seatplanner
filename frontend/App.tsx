
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { SeatPlannerProvider } from './context/SeatPlannerContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import BuildingsPage from './pages/BuildingsPage';
import RoomsPage from './pages/RoomsPage';
import SeatMapPage from './pages/SeatMapPage';
import StudentsPage from './pages/StudentsPage';
import PlanningPage from './pages/PlanningPage';

const App: React.FC = () => {
  return (
    <SeatPlannerProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<BuildingsPage />} />
                  <Route path="/buildings" element={<BuildingsPage />} />
                  <Route path="/buildings/:buildingId/rooms" element={<RoomsPage />} />
                  <Route path="/rooms/:roomId" element={<SeatMapPage />} />
                  <Route path="/students" element={<StudentsPage />} />
                  <Route path="/planning" element={<PlanningPage />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </HashRouter>
    </SeatPlannerProvider>
  );
};

export default App;
