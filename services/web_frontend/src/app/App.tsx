import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';
import { LoginPage } from './pages/LoginPage';
import { DirectoryPage } from './pages/DirectoryPage';
import { AdminPage } from './pages/AdminPage';
import { ProfilePage } from './pages/ProfilePage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAppStore } from '../store/useAppStore';

function AnimatedRoutes() {
  const location = useLocation();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DirectoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(40px)',
            border: '0.5px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            borderRadius: '12px',
            color: '#1C1C1E',
          },
        }}
      />
    </BrowserRouter>
  );
}