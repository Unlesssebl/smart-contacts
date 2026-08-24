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

  deptMapping: {},
  jobTitleMapping: {},
  canonicalSuggestions: null,
  isLoadingSuggestions: false,

  fetchDeptMapping: async () => {
    try {
      const { settingsApi } = await import('@/api/settings');
      const mapping = await settingsApi.getDeptMapping();
      set({ deptMapping: mapping });
    } catch (error) {
      console.error('Failed to fetch dept mapping', error);
      toast.error('Не удалось загрузить справочник отделов');
    }
  },

  updateDeptMapping: async (mapping) => {
    try {
      const { settingsApi } = await import('@/api/settings');
      const newMapping = await settingsApi.updateDeptMapping(mapping);
      set({ deptMapping: newMapping });
      toast.success('Справочник отделов успешно обновлен');
    } catch (error) {
      console.error('Failed to update dept mapping', error);
      toast.error('Ошибка при сохранении справочника отделов');
    }
  },

  fetchJobTitleMapping: async () => {
    try {
      const { settingsApi } = await import('@/api/settings');
      const mapping = await settingsApi.getJobTitleMapping();
      set({ jobTitleMapping: mapping });
    } catch (error) {
      console.error('Failed to fetch job title mapping', error);
      toast.error('Не удалось загрузить справочник должностей');
    }
  },

  updateJobTitleMapping: async (mapping) => {
    try {
      const { settingsApi } = await import('@/api/settings');
      const newMapping = await settingsApi.updateJobTitleMapping(mapping);
      set({ jobTitleMapping: newMapping });
      toast.success('Справочник должностей успешно обновлен');
    } catch (error) {
      console.error('Failed to update job title mapping', error);
      toast.error('Ошибка при сохранении справочника должностей');
    }
  },

  fetchCanonicalSuggestions: async () => {
    set({ isLoadingSuggestions: true });
    try {
      const { settingsApi } = await import('@/api/settings');
      const suggestions = await settingsApi.getCanonicalSuggestions();
      set({ canonicalSuggestions: suggestions, isLoadingSuggestions: false });
    } catch (error) {
      console.error('Failed to fetch canonical suggestions', error);
      set({ isLoadingSuggestions: false });
    }
  },
});

