import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState } from './types';
import { createAuthSlice } from './slices/authSlice';
import { createUsersSlice } from './slices/usersSlice';
import { createChangeRequestsSlice } from './slices/changeRequestsSlice';
import { createReportsSlice } from './slices/reportsSlice';
import { createSupportSlice } from './slices/supportSlice';
import { createAdminSlice } from './slices/adminSlice';
import { createNotificationsSlice } from './slices/notificationsSlice';
import { createInfraSlice } from './slices/infraSlice';
import { createSettingsSlice } from './slices/settingsSlice';

export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createUsersSlice(...a),
      ...createChangeRequestsSlice(...a),
      ...createReportsSlice(...a),
      ...createSupportSlice(...a),
      ...createNotificationsSlice(...a),
      ...createAdminSlice(...a),
      ...createInfraSlice(...a),
      ...createSettingsSlice(...a),
    }),
    {
      name: 'smart-contacts-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
        adSyncUnavailable: state.adSyncUnavailable,
      }),
    }
  )
);
