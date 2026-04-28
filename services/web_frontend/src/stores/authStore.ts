import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  role: string | null;
  is_verified: boolean;
  grace_period_left: number;
  adSyncUnavailable: boolean;
  
  setAuth: (data: { accessToken: string; role: string; is_verified: boolean; grace_period_left: number }) => void;
  setAdSyncStatus: (status: boolean) => void;
  logout: () => void;
  updateVerification: (status: boolean) => void;
  decrementGracePeriod: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      role: null,
      is_verified: false,
      grace_period_left: 3,
      adSyncUnavailable: false,

      setAuth: (data) => set({ 
        accessToken: data.accessToken, 
        role: data.role, 
        is_verified: data.is_verified, 
        grace_period_left: data.grace_period_left 
      }),
      
      setAdSyncStatus: (status) => set({ adSyncUnavailable: status }),
      
      logout: () => set({ 
        accessToken: null, 
        role: null, 
        is_verified: false, 
        grace_period_left: 3,
        adSyncUnavailable: false 
      }),

      updateVerification: (status) => set({ is_verified: status }),
      
      decrementGracePeriod: () => set((state) => ({ 
        grace_period_left: Math.max(0, state.grace_period_left - 1) 
      })),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
