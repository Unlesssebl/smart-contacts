import type { StateCreator } from 'zustand';
import { supportApi } from '@/api/support';
import { toast } from 'sonner';
import type { AppState, SupportSlice } from '../types';

export const createSupportSlice: StateCreator<AppState, [], [], SupportSlice> = (set, get) => ({
  supportTickets: [],
  isLoadingSupportTickets: false,

  fetchSupportTickets: async (status?: string) => {
    set({ isLoadingSupportTickets: true });
    try {
      const tickets = await supportApi.getTickets(status);
      set({ supportTickets: tickets });
    } catch (error) {
      console.error('Failed to fetch support tickets', error);
      toast.error('Не удалось загрузить список обращений');
    } finally {
      set({ isLoadingSupportTickets: false });
    }
  },

  sendSupportTicket: async (data) => {
    try {
      await supportApi.createTicket(data);
      return { success: true };
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { detail?: string } } };
      const message = axiosError.response?.data?.detail || 'Не удалось отправить обращение';
      return { success: false, error: message };
    }
  },

  closeSupportTicket: async (id: string) => {
    try {
      const updated = await supportApi.closeTicket(id);
      set({
        supportTickets: get().supportTickets.map((t) => (t.id === id ? updated : t)),
      });
      toast.success('Обращение закрыто');
    } catch (error) {
      console.error('Failed to close support ticket', error);
      toast.error('Не удалось закрыть обращение');
    }
  },

  reopenSupportTicket: async (id: string) => {
    try {
      const updated = await supportApi.reopenTicket(id);
      set({
        supportTickets: get().supportTickets.map((t) => (t.id === id ? updated : t)),
      });
      toast.success('Обращение снова открыто');
    } catch (error) {
      console.error('Failed to reopen support ticket', error);
      toast.error('Не удалось открыть обращение');
    }
  },
});
