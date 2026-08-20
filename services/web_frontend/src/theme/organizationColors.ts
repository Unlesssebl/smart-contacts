export interface OrganizationColorOption {
  label: string;
  value: string;
}

export const ORGANIZATION_COLORS: readonly OrganizationColorOption[] = [
  { label: 'Синий', value: '#2B5FE0' },
  { label: 'Кобальтовый', value: '#1D4ED8' },
  { label: 'Индиго', value: '#4F46E5' },
  { label: 'Тёмный индиго', value: '#4338CA' },
  { label: 'Фиолетовый', value: '#7C3AED' },
  { label: 'Аметистовый', value: '#9333EA' },
  { label: 'Пурпурный', value: '#A21CAF' },
  { label: 'Маджента', value: '#C026D3' },
  { label: 'Розовый', value: '#DB2777' },
  { label: 'Малиновый', value: '#E11D48' },
  { label: 'Бордовый', value: '#BE123C' },
  { label: 'Красный', value: '#D14343' },
  { label: 'Тёмно-красный', value: '#B91C1C' },
  { label: 'Киноварь', value: '#C2410C' },
  { label: 'Оранжевый', value: '#EA580C' },
  { label: 'Янтарный', value: '#D97706' },
  { label: 'Охра', value: '#B7791F' },
  { label: 'Золотистый', value: '#A16207' },
  { label: 'Оливковый', value: '#4D7C0F' },
  { label: 'Лаймовый', value: '#65A30D' },
  { label: 'Зелёный', value: '#0F9D58' },
  { label: 'Лесной', value: '#15803D' },
  { label: 'Изумрудный', value: '#059669' },
  { label: 'Тёмно-изумрудный', value: '#047857' },
  { label: 'Бирюзовый', value: '#0D9488' },
  { label: 'Тёмно-бирюзовый', value: '#0F766E' },
  { label: 'Циан', value: '#0891B2' },
  { label: 'Морская волна', value: '#0E7490' },
  { label: 'Лазурный', value: '#0284C7' },
  { label: 'Небесный', value: '#0369A1' },
  { label: 'Графитовый', value: '#475569' },
  { label: 'Серо-синий', value: '#64748B' },
  { label: 'Тёплый серый', value: '#57534E' },
  { label: 'Коричневый', value: '#92400E' },
  { label: 'Винный', value: '#9F1239' },
  { label: 'Сливовый', value: '#701A75' },
  { label: 'Ночной индиго', value: '#312E81' },
  { label: 'Тёмно-синий', value: '#1E3A8A' },
  { label: 'Стальной', value: '#334155' },
] as const;

const LEGACY_TAILWIND_COLORS: Record<string, string> = {
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

export const DEFAULT_ORGANIZATION_COLOR = ORGANIZATION_COLORS[0].value;

export function normalizeOrganizationColor(color?: string | null): string {
  const value = color?.trim();
  if (!value) return DEFAULT_ORGANIZATION_COLOR;
  if (value.startsWith('#')) return value.toUpperCase();

  for (const [name, hex] of Object.entries(LEGACY_TAILWIND_COLORS)) {
    if (value.includes(`-${name}-`)) return hex;
  }

  return DEFAULT_ORGANIZATION_COLOR;
}

export function hashOrganizationColor(organization: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(organization.trim().toLocaleLowerCase('ru-RU'))) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return ORGANIZATION_COLORS[(hash >>> 0) % ORGANIZATION_COLORS.length].value;
}

export function getOrganizationTextColor(backgroundColor: string): '#FFFFFF' | '#102F4A' {
  const hex = normalizeOrganizationColor(backgroundColor).slice(1);
  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkLuminance = 0.027;
  const darkContrast = (luminance + 0.05) / (darkLuminance + 0.05);
  return whiteContrast >= darkContrast ? '#FFFFFF' : '#102F4A';
}
