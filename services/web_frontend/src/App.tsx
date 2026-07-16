import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { OverlayScrollbars } from 'overlayscrollbars';
import 'overlayscrollbars/overlayscrollbars.css';
import { LoginPage } from '@/pages/LoginPage';
import { DirectoryPage } from '@/pages/DirectoryPage';
import { AdminPage } from '@/pages/AdminPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAppStore } from '@/store/useAppStore';
import { usePresence } from '@/hooks/usePresence';

function AnimatedRoutes() {
  const location = useLocation();
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  usePresence();

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

import { GatekeeperModal } from '@/components/GatekeeperModal';
import { WifiOff } from 'lucide-react';


function ConnectionLostOverlay() {
  const isApiDown = useAppStore(state => state.isApiDown);
  const [showOverlay, setShowOverlay] = useState<boolean>(false);

  useEffect(() => {
    if (isApiDown) {
      const timer = setTimeout(() => setShowOverlay(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setShowOverlay(false);
    }
  }, [isApiDown]);

  if (!showOverlay) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center border border-zinc-200 dark:border-zinc-800">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100">Соединение потеряно</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Сервер временно недоступен или выполняется обновление. Мы пытаемся восстановить связь...
        </p>
        <div className="flex justify-center items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const isAuthenticated = useAppStore(state => state.isAuthenticated);
  const fetchMyPendingFields = useAppStore(state => state.fetchMyPendingFields);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyPendingFields();
    }
  }, [isAuthenticated, fetchMyPendingFields]);

  useEffect(() => {
    const instance = OverlayScrollbars(document.body, {
      scrollbars: {
        theme: 'os-theme-dark',
        autoHide: 'scroll',
        autoHideDelay: 800,
      },
    });
    return () => instance.destroy();
  }, []);

  return (
    <BrowserRouter>
      <ConnectionLostOverlay />
      <AnimatedRoutes />
      <GatekeeperModal />
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