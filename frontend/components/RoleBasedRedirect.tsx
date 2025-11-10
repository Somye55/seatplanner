import React from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../services/authService";

const RoleBasedRedirect: React.FC = () => {
  const user = authService.getUser();
  const isAdmin = authService.isAdmin();

  if (isAdmin) {
    return <Navigate to="/locations" replace />;
  }

  if (user?.role === "Teacher") {
    return <Navigate to="/find-room" replace />;
  }

  if (user?.role === "Student") {
    return <Navigate to="/student-bookings" replace />;
  }

  // Default fallback
  return <Navigate to="/locations" replace />;
};

export default RoleBasedRedirect;
