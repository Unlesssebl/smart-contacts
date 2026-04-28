import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage/LoginPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import DirectoryPage from './pages/DirectoryPage/DirectoryPage';
import AdminPage from './pages/AdminPage/AdminPage';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import MainLayout from './components/MainLayout/MainLayout';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/profile',
        element: <ProfilePage />,
      },
      {
        path: '/directory',
        element: <DirectoryPage />,
      },
      {
        path: '/admin',
        element: (
          <ProtectedRoute roles={['it_operator']}>
            <AdminPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/',
    element: <Navigate to="/directory" replace />,
  },
]);
