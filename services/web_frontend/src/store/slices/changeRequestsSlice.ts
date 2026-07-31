import type { StateCreator } from 'zustand';
import { changeRequestsApi } from '@/api/changeRequests';
import { adminApi } from '@/api/admin';
import { toast } from 'sonner';
import type { AppState, ChangeRequestsSlice } from '../types';
import { getErrorStatus } from '@/api/errors';

export const createChangeRequestsSlice: StateCreator<AppState, [], [], ChangeRequestsSlice> = (set, get) => ({
  changeRequests: [],
  pendingFields: null,

  fetchMyPendingFields: async () => {
    if (!get().currentUser) return;
    try {
      const requests = await changeRequestsApi.getMyChangeRequests();
      const activePending: Record<string, string> = {};
      requests.forEach((r) => {
        if (r.status === 'pending' || r.status === 'conflict' || r.status === 'approved') {
          const fieldKey = r.field_name;
          if (fieldKey) activePending[fieldKey] = r.new_value;
        }
      });
      set({ pendingFields: activePending });
    } catch (error) {
      console.error('Failed to fetch pending fields', error);
      set({ pendingFields: {} });
    }
  },

  addChangeRequest: async (request) => {
    try {
      const newRequest = await changeRequestsApi.createChangeRequest(request);
      set((state) => ({
        changeRequests: [newRequest, ...state.changeRequests],
        pendingFields: state.pendingFields
          ? { ...state.pendingFields, [request.attribute_name]: request.new_value }
          : { [request.attribute_name]: request.new_value },
      }));
      toast.success('Заявка на изменение контактов успешно создана');
    } catch (error: unknown) {
      console.error('Failed to create change request', error);
      if (getErrorStatus(error) === 422) {
        toast.error('Неверный формат введённых данных');
      } else if (getErrorStatus(error) === 409) {
        set((state) => ({
          pendingFields: state.pendingFields
            ? { ...state.pendingFields, [request.attribute_name]: request.new_value }
            : { [request.attribute_name]: request.new_value },
        }));
        toast.error('Для этого поля уже есть заявка на рассмотрении');
      } else {
        toast.error('Ошибка при создании заявки');
      }
      throw error;
    }
  },

  approveChangeRequest: async (id) => {
    try {
      const updatedRequest = await adminApi.approveChangeRequest(id);
      set((state) => ({
        changeRequests: state.changeRequests.map((r) => (r.id === id ? updatedRequest : r)),
      }));
      toast.success('Заявка одобрена и будет применена в AD');
    } catch (error) {
      console.error('Failed to approve request', error);
      toast.error('Не удалось одобрить заявку');
    }
  },

  rejectChangeRequest: async (id) => {
    try {
      const updatedRequest = await adminApi.rejectChangeRequest(id);
      set((state) => ({
        changeRequests: state.changeRequests.map((r) => (r.id === id ? updatedRequest : r)),
      }));
      toast.success('Заявка отклонена');
    } catch (error) {
      console.error('Failed to reject request', error);
      toast.error('Не удалось отклонить заявку');
    }
  },
});
