import apiClient from './client';

export interface LDAPSettings {
  ad_user?: string;
  is_password_set?: boolean;
  ad_password?: string;
  status?: string | null;
  last_error?: string | null;
}

export const settingsApi = {
  getLDAPSettings: async (): Promise<LDAPSettings> => {
    const response = await apiClient.get<LDAPSettings>('/admin/settings/ldap');
    return response.data;
  },

  updateLDAPSettings: async (settings: LDAPSettings): Promise<LDAPSettings> => {
    const response = await apiClient.post<LDAPSettings>('/admin/settings/ldap', settings);
    return response.data;
  },

  getOUMapping: async (): Promise<Record<string, string>> => {
    const response = await apiClient.get<{ mapping: Record<string, string> }>('/admin/settings/ou-mapping');
    return response.data.mapping || {};
  },

  updateOUMapping: async (mapping: Record<string, string>): Promise<Record<string, string>> => {
    const response = await apiClient.post<{ mapping: Record<string, string> }>('/admin/settings/ou-mapping', { mapping });
    return response.data.mapping || {};
  },

  getADOus: async (): Promise<Record<string, any>> => {
    const response = await apiClient.get<Record<string, any>>('/admin/ldap/ous');
    return response.data || {};
  },
};
