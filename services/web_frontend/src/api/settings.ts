import apiClient from './client';

export interface OUMappingValue {
  org: string;
  color: string;
}


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

  getOUMapping: async (): Promise<Record<string, OUMappingValue>> => {
    const response = await apiClient.get<{ mapping: Record<string, any> }>('/admin/settings/ou-mapping');
    const raw = response.data.mapping || {};
    const normalized: Record<string, OUMappingValue> = {};
    for (const [ou, val] of Object.entries(raw)) {
      if (typeof val === 'string') {
        normalized[ou] = { org: val, color: 'bg-blue-50 text-blue-700 ring-blue-700/10' };
      } else if (val && typeof val === 'object') {
        normalized[ou] = { org: val.org || '', color: val.color || 'bg-blue-50 text-blue-700 ring-blue-700/10' };
      }
    }
    return normalized;
  },

  updateOUMapping: async (mapping: Record<string, OUMappingValue>): Promise<Record<string, OUMappingValue>> => {
    const response = await apiClient.post<{ mapping: Record<string, any> }>('/admin/settings/ou-mapping', { mapping });
    const raw = response.data.mapping || {};
    const normalized: Record<string, OUMappingValue> = {};
    for (const [ou, val] of Object.entries(raw)) {
      if (typeof val === 'string') {
        normalized[ou] = { org: val, color: 'bg-blue-50 text-blue-700 ring-blue-700/10' };
      } else if (val && typeof val === 'object') {
        normalized[ou] = { org: val.org || '', color: val.color || 'bg-blue-50 text-blue-700 ring-blue-700/10' };
      }
    }
    return normalized;
  },

  getADOus: async (): Promise<Record<string, any>> => {
    const response = await apiClient.get<Record<string, any>>('/admin/ldap/ous');
    return response.data || {};
  },
};
