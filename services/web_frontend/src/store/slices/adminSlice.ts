import type { StateCreator } from 'zustand';
import { adminApi } from '@/api/admin';
import { supportApi } from '@/api/support';
import { toast } from 'sonner';
import type { AppState, AdminSlice } from '../types';

export const createAdminSlice: StateCreator<AppState, [], [], AdminSlice> = (set) => ({
  fetchAdminData: async () => {
    try {
      const [requests, reportsData, tickets] = await Promise.all([
        adminApi.getChangeRequests(),
        adminApi.getReports(),
        supportApi.getTickets(),
      ]);
      set({ changeRequests: requests, reports: reportsData, supportTickets: tickets });
    } catch (error) {
      console.error('Failed to fetch admin data', error);
      toast.error('Не удалось загрузить данные панели администратора');
    }
  },

  forceSync: async () => {
    try {
      await adminApi.forceSync();
      toast.success('Синхронизация с AD запущена');
    } catch (error) {
      console.error('Failed to force sync', error);
      toast.error('Ошибка при запуске синхронизации');
    }
  },
});
