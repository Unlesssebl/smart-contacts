export const DEFAULT_ORG_COLOR = '#2B5FE0';
export const FALLBACK_ORG_COLOR = '#94A3B8';

const TAILWIND_COLOR_MAP: Record<string, string> = {
  blue: '#2B5FE0',
  indigo: '#4F46E5',
  purple: '#7C3AED',
  pink: '#DB2777',
  red: '#D14343',
  orange: '#EA580C',
  yellow: '#B7791F',
  green: '#0F9D58',
  emerald: '#059669',
  teal: '#0D9488',
  cyan: '#0891B2',
  slate: '#64748B',
  gray: '#64748B',
};

/**
 * Возвращает HEX-цвет для организации на основе orgColors из админки (OU_MAPPING).
 * Умеет обрабатывать как HEX-коды, так и Tailwind-классы из админки (например, 'bg-blue-50 text-blue-700...').
 */
export function getOrgColor(organization?: string | null, orgColors?: Record<string, string>): string {
  if (!organization || !orgColors || !orgColors[organization]) {
    return DEFAULT_ORG_COLOR;
  }

  const rawColor = orgColors[organization].trim();

  // Если это уже HEX-код (#2B5FE0 или #fff)
  if (rawColor.startsWith('#')) {
    return rawColor;
  }

  // Если это Tailwind-строка из админ-панели ('bg-blue-50 text-blue-700 ...')
  for (const [key, hex] of Object.entries(TAILWIND_COLOR_MAP)) {
    if (rawColor.includes(`-${key}-`)) {
      return hex;
    }
  }

  return DEFAULT_ORG_COLOR;
}

