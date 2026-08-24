import type { StateCreator } from 'zustand';
import { adminApi } from '@/api/admin';
import { supportApi } from '@/api/support';
import { toast } from 'sonner';
import type { AppState, AdminSlice } from '../types';

export const createAdminSlice: StateCreator<AppState, [], [], AdminSlice> = (set, get) => ({
  securityIncidents: [],
  isLoadingSecurity: false,

  fetchAdminData: async () => {
    try {
      const [requests, reportsData, tickets, incidents] = await Promise.all([
        adminApi.getChangeRequests(),
        adminApi.getReports(),
        supportApi.getTickets(),
        adminApi.getSecurityIncidents().catch(() => []),
      ]);
      set({
        changeRequests: requests,
        reports: reportsData,
        supportTickets: tickets,
        securityIncidents: incidents,
      });
    } catch (error) {
      console.error('Failed to fetch admin data', error);
      toast.error('Не удалось загрузить данные панели администратора');
    }
  },

  fetchSecurityIncidents: async () => {
    set({ isLoadingSecurity: true });
    try {
      const incidents = await adminApi.getSecurityIncidents();
      set({ securityIncidents: incidents });
    } catch (error) {
      console.error('Failed to fetch security incidents', error);
      toast.error('Не удалось загрузить журнал безопасности');
    } finally {
      set({ isLoadingSecurity: false });
    }
  },

  unblockIp: async (ip: string) => {
    try {
      await adminApi.unblockIp(ip);
      toast.success(`IP ${ip} успешно разблокирован`);
      await get().fetchSecurityIncidents();
      return true;
    } catch (error) {
      console.error('Failed to unblock IP', error);
      toast.error(`Не удалось разблокировать IP ${ip}`);
      return false;
    }
  },

  blockIp: async (ip: string, permanent: boolean = true, durationSeconds: number = 3600) => {
    try {
      await adminApi.blockIp(ip, permanent, durationSeconds);
      toast.success(`IP ${ip} успешно заблокирован`);
      await get().fetchSecurityIncidents();
      return true;
    } catch (error) {
      console.error('Failed to block IP', error);
      toast.error(`Не удалось заблокировать IP ${ip}`);
      return false;
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
