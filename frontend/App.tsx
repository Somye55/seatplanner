
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HeroUIProvider } from '@heroui/react';
import { SeatPlannerProvider } from './context/SeatPlannerContext';
import { ThemeProvider } from './providers/ThemeProvider';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import BuildingsPage from './pages/BuildingsPage';
import RoomsPage from './pages/RoomsPage';
import SeatMapPage from './pages/SeatMapPage';
import StudentsPage from './pages/StudentsPage';

const App: React.FC = () => {
  return (
    <HeroUIProvider>
      <ThemeProvider>
        <SeatPlannerProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Navigate to="/signin" replace />} />
              <Route path="/signin" element={<LoginPage />} />
              <Route path="/signup" element={<LoginPage />} />
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
      </ThemeProvider>
    </HeroUIProvider>
  );
};

export default App;
