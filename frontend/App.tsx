
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SeatPlannerProvider } from './context/SeatPlannerContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import BuildingsPage from './pages/BuildingsPage';
import RoomsPage from './pages/RoomsPage';
import SeatMapPage from './pages/SeatMapPage';
import StudentsPage from './pages/StudentsPage';

const App: React.FC = () => {
  return (
    <SeatPlannerProvider>
      <BrowserRouter>
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
                  <Route path="/students" element={<PrivateRoute requireAdmin={true}><StudentsPage /></PrivateRoute>} />
                  <Route path="*" element={<Navigate to="/buildings" replace />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </SeatPlannerProvider>
  );
};

export default App;
