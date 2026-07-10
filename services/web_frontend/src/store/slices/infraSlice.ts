import type { StateCreator } from 'zustand';
import type { AppState, InfraSlice } from '../types';

export const createInfraSlice: StateCreator<AppState, [], [], InfraSlice> = (set) => ({
  adSyncUnavailable: false,
  setAdSyncStatus: (status) => set({ adSyncUnavailable: status }),
  isApiDown: false,
  setApiDown: (status) => set({ isApiDown: status }),
});
