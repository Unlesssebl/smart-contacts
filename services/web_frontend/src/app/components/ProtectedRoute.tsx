import { Navigate } from 'react-router';
import { useAppStore } from '../../store/useAppStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser } = useAppStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && currentUser?.role !== 'admin' && currentUser?.role !== 'it_operator') {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <div className="fixed left-[60px] top-[48px] z-20 pointer-events-none">
        <img
          src="/GK_logo.png"
          alt="ТЭМПО"
          className="h-[50px] object-contain opacity-90"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </div>
      {children}
    </>
  );
}
