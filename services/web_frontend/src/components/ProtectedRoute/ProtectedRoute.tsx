import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
  const { accessToken, role } = useAuthStore();
  const location = useLocation();

  if (!accessToken) {
    // Redirect to login but save the current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && role && !roles.includes(role)) {
    // Role not authorized, redirect to profile or home
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
