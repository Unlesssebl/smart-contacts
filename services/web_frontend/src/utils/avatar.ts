export const AVATAR_PALETTE = [
  '#dc2626', // Red
  '#ea580c', // Orange
  '#d97706', // Amber
  '#65a30d', // Lime
  '#16a34a', // Green
  '#0d9488', // Teal
  '#0891b2', // Cyan
  '#2563eb', // Blue
  '#4f46e5', // Indigo
  '#7c3aed', // Violet
  '#c026d3', // Fuchsia
  '#db2777', // Pink
];

/**
 * Returns a color for the avatar.
 * If a valid savedColor is provided from the palette, it returns it.
 * Otherwise, it computes a deterministic color based on the user's name.
 */
export function getAvatarColor(name: string, savedColor?: string | null): string {
  if (savedColor && AVATAR_PALETTE.includes(savedColor)) {
    return savedColor;
  }

  if (!name) {
    return '#64748b'; // Default slate gray if no name
  }

  // Simple string hashing function
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert hash to a positive index within the palette bounds
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}
