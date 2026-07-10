import type { StateCreator } from 'zustand';
import { toast } from 'sonner';
import type { AppState, SettingsSlice } from '../types';

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set) => ({
  ldapSettings: null,

  fetchLDAPSettings: async (silent = false) => {
    try {
      const { settingsApi } = await import('@/api/settings');
      const settings = await settingsApi.getLDAPSettings();
      set({ ldapSettings: settings });
    } catch (error) {
      console.error('Failed to fetch LDAP settings', error);
      if (!silent) toast.error('Не удалось загрузить настройки LDAP');
    }
  },

  updateLDAPSettings: async (newSettings) => {
    try {
      const { settingsApi } = await import('@/api/settings');
      const settings = await settingsApi.updateLDAPSettings(newSettings);
      set({ ldapSettings: settings });
      toast.success('Настройки LDAP успешно сохранены');
    } catch (error) {
      console.error('Failed to update LDAP settings', error);
      toast.error('Ошибка при сохранении настроек LDAP');
    }
  },

  ouMapping: {},

  fetchOUMapping: async () => {
    try {
      const { settingsApi } = await import('@/api/settings');
      const mapping = await settingsApi.getOUMapping();
      set({ ouMapping: mapping });
    } catch (error) {
      console.error('Failed to fetch OU mapping', error);
      toast.error('Не удалось загрузить маппинг OU');
    }
  },

  updateOUMapping: async (mapping) => {
    try {
      const { settingsApi } = await import('@/api/settings');
      const newMapping = await settingsApi.updateOUMapping(mapping);
      set({ ouMapping: newMapping });
      toast.success('Маппинг OU успешно сохранен');
    } catch (error) {
      console.error('Failed to update OU mapping', error);
      toast.error('Ошибка при сохранении маппинга OU');
    }
  },
});
