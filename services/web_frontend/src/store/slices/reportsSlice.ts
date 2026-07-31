import type { StateCreator } from 'zustand';
import { reportsApi } from '@/api/reports';
import { adminApi } from '@/api/admin';
import { toast } from 'sonner';
import type { AppState, ReportsSlice } from '../types';
import { getErrorStatus } from '@/api/errors';

export const createReportsSlice: StateCreator<AppState, [], [], ReportsSlice> = (set) => ({
  reports: [],

  addReport: async (report) => {
    try {
      await reportsApi.createReport(report);
      toast.success('Заявка успешно отправлена');
    } catch (error: unknown) {
      if (getErrorStatus(error) === 409) {
        toast.error('Вы уже предложили правку для этого пользователя');
      } else {
        console.error('Failed to create report', error);
        toast.error('Ошибка при отправке заявки');
      }
      throw error;
    }
  },

  approveReport: async (id) => {
    try {
      const updatedReport = await adminApi.approveReport(id);
      set((state) => ({
        reports: state.reports.map((r) => (r.id === id ? updatedReport : r)),
      }));
      toast.success('Жалоба одобрена');
    } catch (error) {
      console.error('Failed to approve report', error);
      toast.error('Не удалось одобрить жалобу');
    }
  },

  rejectReport: async (id) => {
    try {
      const updatedReport = await adminApi.rejectReport(id);
      set((state) => ({
        reports: state.reports.map((r) => (r.id === id ? updatedReport : r)),
      }));
      toast.success('Жалоба отклонена');
    } catch (error) {
      console.error('Failed to reject report', error);
      toast.error('Не удалось отклонить жалобу');
    }
  },
});
