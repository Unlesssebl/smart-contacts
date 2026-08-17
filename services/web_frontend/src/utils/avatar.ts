export const CURATED_PALETTE = [
  '#356F9F', // Brand blue
  '#3B7FB2', // Cerulean
  '#2F8192', // Cyan
  '#3A806D', // Teal
  '#557A5B', // Green
  '#5B6FA8', // Indigo
  '#7468A3', // Violet
  '#8A6493', // Plum
  '#A15F78', // Berry
  '#546E7A', // Blue slate
];

const LEGACY_COLOR_MAP: Record<string, string> = {
  '#356B99': '#356F9F',
  '#4A6984': '#546E7A',
  '#5C7A70': '#3A806D',
  '#8B6B70': '#8A6493',
  '#7A6B5C': '#557A5B',
  '#5D5D7A': '#7468A3',
  '#6B7A5C': '#557A5B',
  '#845A4A': '#A15F78',
  '#477DA8': '#3B7FB2',
  '#3F718B': '#2F8192',
  '#5677A3': '#5B6FA8',
  '#4C8295': '#3A806D',
  '#4B6C8B': '#546E7A',
  '#5B7595': '#7468A3',
  '#397A92': '#2F8192',
};

/**
 * Возвращает индивидуальный цвет для аватарки сотрудника.
 * 1. Если пользователь выбрал цвет в профиле (savedColor) — используется он.
 * 2. Иначе рассчитывается персональный цвет из курируемой палитры на основе Имени сотрудника.
 */
export function getAvatarColor(name: string | null | undefined, savedColor?: string | null): string {
  if (savedColor && CURATED_PALETTE.includes(savedColor)) {
    return savedColor;
  }

  if (savedColor) {
    const migratedColor = LEGACY_COLOR_MAP[savedColor.toUpperCase()];
    if (migratedColor) return migratedColor;
  }
  
  if (!name || !name.trim()) {
    return CURATED_PALETTE[0]; // Фирменный синий по умолчанию
  }

  let hash = 0;
  const str = name.trim();
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % CURATED_PALETTE.length;
  return CURATED_PALETTE[index];
}

