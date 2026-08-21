import apiClient from './client';
import type { SupportTicket, SupportTicketCreateInput } from '@/types';

export const supportApi = {
  createTicket: async (data: SupportTicketCreateInput): Promise<{ status: string; id: string; message: string }> => {
    const response = await apiClient.post('/support/tickets', data);
    return response.data;
  },

  getTickets: async (status?: string): Promise<SupportTicket[]> => {
    const params = status && status !== 'all' ? { status } : {};
    const response = await apiClient.get<SupportTicket[]>('/admin/support-tickets', { params });
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
