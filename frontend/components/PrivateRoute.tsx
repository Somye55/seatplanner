import React from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../services/authService";

interface PrivateRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requireTeacher?: boolean;
  requireStudent?: boolean;
  requireAdminOrTeacher?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  requireAdmin = false,
  requireSuperAdmin = false,
  requireTeacher = false,
  requireStudent = false,
  requireAdminOrTeacher = false,
}) => {
  const isAuth = authService.isAuthenticated();
  const user = authService.getUser();

  console.log("🔒 PrivateRoute check:", {
    isAuthenticated: isAuth,
    user: user,
    requireAdmin,
    requireSuperAdmin,
    requireTeacher,
    requireStudent,
    requireAdminOrTeacher,
    path: window.location.pathname,
  });

  if (!isAuth) {
    console.log("🔒 PrivateRoute: Redirecting to signin");
    return <Navigate to="/signin" replace />;
  }

  if (requireSuperAdmin && !authService.isSuperAdmin()) {
    console.log("🔒 PrivateRoute: Not super admin, redirecting to home");
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !authService.isAdmin()) {
    console.log("🔒 PrivateRoute: Not admin, redirecting to home");
    return <Navigate to="/" replace />;
  }

  if (requireTeacher && user?.role !== "Teacher") {
    console.log("🔒 PrivateRoute: Not teacher, redirecting to home");
    return <Navigate to="/" replace />;
  }

  if (requireStudent && user?.role !== "Student") {
    console.log("🔒 PrivateRoute: Not student, redirecting to home");
    return <Navigate to="/" replace />;
  }

  if (
    requireAdminOrTeacher &&
    !authService.isAdmin() &&
    user?.role !== "Teacher"
  ) {
    console.log("🔒 PrivateRoute: Not admin or teacher, redirecting to home");
    return <Navigate to="/" replace />;
  }

  console.log("🔒 PrivateRoute: Access granted");
  return <>{children}</>;
};

export default PrivateRoute;
