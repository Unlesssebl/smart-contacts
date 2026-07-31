import { Navigate } from 'react-router';
import { useAppStore } from '@/store/useAppStore';
import { useShallow } from 'zustand/react/shallow';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser } = useAppStore(
    useShallow((state) => ({
      isAuthenticated: state.isAuthenticated,
      currentUser: state.currentUser,
    })),
  );

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && currentUser?.role !== 'admin' && currentUser?.role !== 'it_operator') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
