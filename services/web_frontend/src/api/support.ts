import apiClient from './client';
import type { SupportTicket, SupportTicketCreateInput, PaginatedSupportTickets } from '@/types';

export const supportApi = {
  createTicket: async (data: SupportTicketCreateInput): Promise<{ status: string; id: string; message: string }> => {
    const response = await apiClient.post('/support/tickets', data);
    return response.data;
  },

  getTickets: async (params?: { status?: string; page?: number; pageSize?: number; search?: string }): Promise<PaginatedSupportTickets> => {
    const queryParams: Record<string, string | number> = {};
    if (params?.status && params.status !== 'all') {
      queryParams.status = params.status;
    }
    if (params?.page) {
      queryParams.page = params.page;
    }
    if (params?.pageSize) {
      queryParams.page_size = params.pageSize;
    }
    if (params?.search && params.search.trim()) {
      queryParams.search = params.search.trim();
    }
    const response = await apiClient.get<PaginatedSupportTickets>('/admin/support-tickets', { params: queryParams });
    return response.data;
  },

  closeTicket: async (ticketId: string): Promise<SupportTicket> => {
    const response = await apiClient.patch<SupportTicket>(`/admin/support-tickets/${ticketId}/close`);
    return response.data;
  },

  reopenTicket: async (ticketId: string): Promise<SupportTicket> => {
    const response = await apiClient.patch<SupportTicket>(`/admin/support-tickets/${ticketId}/reopen`);
    return response.data;
  },
};
