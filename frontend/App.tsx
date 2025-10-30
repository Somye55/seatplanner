
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { SeatPlannerProvider } from './context/SeatPlannerContext';
import Layout from './components/Layout';
import BuildingsPage from './pages/BuildingsPage';
import RoomsPage from './pages/RoomsPage';
import SeatMapPage from './pages/SeatMapPage';
import StudentsPage from './pages/StudentsPage';
import PlanningPage from './pages/PlanningPage';

const App: React.FC = () => {
  return (
    <SeatPlannerProvider>
      <HashRouter>
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
      </HashRouter>
    </SeatPlannerProvider>
  );
};

export default App;
