import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HeroUIProvider, ToastProvider } from "@heroui/react";
import { SeatPlannerProvider } from "./context/SeatPlannerContext";
import { ThemeProvider } from "./providers/ThemeProvider";
import Layout from "./components/Layout";
import PrivateRoute from "./components/PrivateRoute";
import RoleBasedRedirect from "./components/RoleBasedRedirect";
import SignInPage from "./pages/SignInPage";
import BuildingsPage from "./pages/BuildingsPage";
import RoomsPage from "./pages/RoomsPage";
import SeatMapPage from "./pages/SeatMapPage";
import StudentsPage from "./pages/StudentsPage";
import TeacherDashboardPage from "./pages/TeacherDashboardPage";
import MyBookingsPage from "./pages/MyBookingsPage";
import StudentBookingsPage from "./pages/StudentBookingsPage";
import FacultyManagementPage from "./pages/FacultyManagementPage";
import AdminManagementPage from "./pages/AdminManagementPage";
import PasswordResetPage from "./pages/PasswordResetPage";
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
                        <Route path="/" element={<RoleBasedRedirect />} />
                        <Route
                          path="/locations"
                          element={<LocationHierarchyPage />}
                        />
                        <Route path="/buildings" element={<BuildingsPage />} />
                        <Route
                          path="/buildings/:buildingId/rooms"
                          element={
                            <PrivateRoute requireAdminOrTeacher={true}>
                              <RoomsPage />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/rooms/:roomId"
                          element={
                            <PrivateRoute requireAdminOrTeacher={true}>
                              <SeatMapPage />
                            </PrivateRoute>
                          }
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
                          path="/reset-password"
                          element={
                            <PrivateRoute requireAdmin={true}>
                              <PasswordResetPage />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/find-room"
                          element={<TeacherDashboardPage />}
                        />
                        <Route
                          path="/my-bookings"
                          element={
                            <PrivateRoute requireTeacher={true}>
                              <MyBookingsPage />
                            </PrivateRoute>
                          }
                        />
                        <Route
                          path="/student-bookings"
                          element={
                            <PrivateRoute requireStudent={true}>
                              <StudentBookingsPage />
                            </PrivateRoute>
                          }
                        />
                        <Route path="*" element={<RoleBasedRedirect />} />
                      </Routes>
                    </Layout>
                  </PrivateRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </SeatPlannerProvider>
        <ToastProvider placement="bottom-right" />
      </ThemeProvider>
    </HeroUIProvider>
  );
};

export default App;
