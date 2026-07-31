export const CURATED_PALETTE = [
  '#356b99', // Brand Blue (ТЭМПО)
  '#4A6984', // Muted Steel Blue
  '#5C7A70', // Muted Sea Green
  '#8B6B70', // Muted Dusty Rose
  '#7A6B5C', // Muted Mocha
  '#5D5D7A', // Muted Purple/Slate
  '#6B7A5C', // Muted Olive
  '#845A4A', // Muted Rust
];

/**
 * Возвращает индивидуальный цвет для аватарки сотрудника.
 * 1. Если пользователь выбрал цвет в профиле (savedColor) — используется он.
 * 2. Иначе рассчитывается персональный цвет из курируемой палитры на основе Имени сотрудника.
 */
export function getAvatarColor(name: string | null | undefined, savedColor?: string | null): string {
  if (savedColor && CURATED_PALETTE.includes(savedColor)) {
    return savedColor;
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

