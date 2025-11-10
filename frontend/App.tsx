import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { SeatPlannerProvider } from "./context/SeatPlannerContext";
import { ThemeProvider } from "./providers/ThemeProvider";
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";
import SignInPage from "./pages/SignInPage";
import BuildingsPage from "./pages/BuildingsPage";
import RoomsPage from "./pages/RoomsPage";
import SeatMapPage from "./pages/SeatMapPage";
import StudentsPage from "./pages/StudentsPage";
import TeacherDashboardPage from "./pages/TeacherDashboardPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import FacultyManagementPage from "./pages/FacultyManagementPage";
import AdminManagementPage from "./pages/AdminManagementPage";
import BlocksPage from "./pages/BlocksPage";
import FloorsPage from "./pages/FloorsPage";
import LocationHierarchyPage from "./pages/LocationHierarchyPage";

const App: React.FC = () => {
  return (
    <HeroUIProvider>
      <ThemeProvider>
        <SeatPlannerProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/signin" element={<SignInPage />} />
              <Route
                path="/login"
                element={<Navigate to="/signin" replace />}
              />
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<LocationHierarchyPage />} />
                        <Route
                          path="/locations"
                          element={<LocationHierarchyPage />}
                        />
                        <Route path="/buildings" element={<BuildingsPage />} />
                        <Route
                          path="/buildings/:buildingId/rooms"
                          element={<RoomsPage />}
                        />
                        <Route
                          path="/rooms/:roomId"
                          element={<SeatMapPage />}
                        />
                        <Route
                          path="/blocks"
                          element={
                            <PrivateRoute requireAdmin={true}>
                              <BlocksPage />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/floors"
                          element={
                            <PrivateRoute requireAdmin={true}>
                              <FloorsPage />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/students"
                          element={
                            <PrivateRoute requireAdmin={true}>
                              <StudentsPage />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/faculty"
                          element={
                            <PrivateRoute requireAdmin={true}>
                              <FacultyManagementPage />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/admins"
                          element={
                            <PrivateRoute requireSuperAdmin={true}>
                              <AdminManagementPage />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/find-room"
                          element={<TeacherDashboardPage />}
                        />
                        <Route
                          path="/my-bookings"
                          element={<MyBookingsPage />}
                        />
                        <Route
                          path="*"
                          element={<Navigate to="/locations" replace />}
                        />
                      </Routes>
                    </Layout>
                  </PrivateRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </SeatPlannerProvider>
      </ThemeProvider>
      <ToastProvider placement="bottom-right" />
    </HeroUIProvider>
  );
};

export default App;
