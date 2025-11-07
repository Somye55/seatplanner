import React from "react";
import { Navigate } from "react-router-dom";
import { authService } from "../services/authService";

interface PrivateRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const isAuth = authService.isAuthenticated();
  const user = authService.getUser();

  console.log("🔒 PrivateRoute check:", {
    isAuthenticated: isAuth,
    user: user,
    requireAdmin,
    path: window.location.pathname,
  });

  if (!isAuth) {
    console.log("🔒 PrivateRoute: Redirecting to signin");
    return <Navigate to="/signin" replace />;
  }

  if (requireAdmin && !authService.isAdmin()) {
    console.log("🔒 PrivateRoute: Not admin, redirecting to home");
    return <Navigate to="/" replace />;
  }

  console.log("🔒 PrivateRoute: Access granted");
  return <>{children}</>;
};

export default PrivateRoute;
