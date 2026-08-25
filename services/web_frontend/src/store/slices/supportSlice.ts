import type { StateCreator } from 'zustand';
import { supportApi } from '@/api/support';
import { toast } from 'sonner';
import type { AppState, SupportSlice } from '../types';

export const createSupportSlice: StateCreator<AppState, [], [], SupportSlice> = (set, get) => ({
  supportTickets: [],
  totalSupportTickets: 0,
  supportTicketPage: 1,
  supportTicketPageSize: 20,
  supportTicketTotalPages: 0,
  isLoadingSupportTickets: false,

  fetchSupportTickets: async (params) => {
    set({ isLoadingSupportTickets: true });
    try {
      const page = params?.page ?? get().supportTicketPage ?? 1;
      const pageSize = params?.pageSize ?? get().supportTicketPageSize ?? 20;
      const res = await supportApi.getTickets({
        status: params?.status,
        page,
        pageSize,
        search: params?.search,
      });
      set({
        supportTickets: res.items,
        totalSupportTickets: res.total,
        supportTicketPage: res.page,
        supportTicketPageSize: res.page_size,
        supportTicketTotalPages: res.total_pages,
      });
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
