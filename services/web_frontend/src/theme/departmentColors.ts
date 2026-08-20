import { DEFAULT_ORGANIZATION_COLOR, normalizeOrganizationColor } from './organizationColors';

export const DEFAULT_ORG_COLOR = DEFAULT_ORGANIZATION_COLOR;
export const FALLBACK_ORG_COLOR = '#94A3B8';

/**
 * Возвращает HEX-цвет для организации на основе orgColors из админки (OU_MAPPING).
 * Умеет обрабатывать как HEX-коды, так и Tailwind-классы из админки (например, 'bg-blue-50 text-blue-700...').
 */
export function getOrgColor(organization?: string | null, orgColors?: Record<string, string>): string {
  if (!organization || !orgColors || !orgColors[organization]) {
    return DEFAULT_ORG_COLOR;
  }

  return normalizeOrganizationColor(orgColors[organization]);
}

