import apiClient from './client';

export interface OUMappingValue {
  org: string;
}

export interface ADOrganizationalUnitTree {
  [name: string]: ADOrganizationalUnitTree;
}

function normalizeOUMapping(raw: Record<string, unknown>): Record<string, OUMappingValue> {
  const normalized: Record<string, OUMappingValue> = {};

  for (const [ou, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      normalized[ou] = { org: value };
      continue;
    }

    if (value && typeof value === 'object') {
      const candidate = value as Partial<OUMappingValue>;
      normalized[ou] = {
        org: typeof candidate.org === 'string' ? candidate.org : '',
      };
    }
  }

  return normalized;
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
    const response = await apiClient.get<{ mapping: Record<string, unknown> }>('/admin/settings/ou-mapping');
    return normalizeOUMapping(response.data.mapping || {});
  },

  updateOUMapping: async (mapping: Record<string, OUMappingValue>): Promise<Record<string, OUMappingValue>> => {
    const response = await apiClient.post<{ mapping: Record<string, unknown> }>('/admin/settings/ou-mapping', { mapping });
    return normalizeOUMapping(response.data.mapping || {});
  },

  getADOus: async (): Promise<ADOrganizationalUnitTree> => {
    const response = await apiClient.get<ADOrganizationalUnitTree>('/admin/ldap/ous');
    return response.data || {};
  },
};
