import { BrowserRouter } from 'react-router';
import { Toaster } from 'sonner';
import 'overlayscrollbars/overlayscrollbars.css';
import { AppLifecycle } from '@/app/AppLifecycle';
import { AppRouter } from '@/app/AppRouter';
import { ConnectionLostOverlay } from '@/components/ConnectionLostOverlay';
import { GatekeeperModal } from '@/components/GatekeeperModal';

export default function App() {
  return (
    <BrowserRouter>
      <AppLifecycle />
      <ConnectionLostOverlay />
      <AppRouter />
      <GatekeeperModal />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
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
