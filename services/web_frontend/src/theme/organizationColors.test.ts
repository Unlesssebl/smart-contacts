import { describe, expect, it } from 'vitest';
import {
  hashOrganizationColor,
  getOrganizationTextColor,
  normalizeOrganizationColor,
  ORGANIZATION_COLORS,
} from './organizationColors';

describe('organization colors', () => {
  it('provides an expanded palette without duplicate values', () => {
    expect(ORGANIZATION_COLORS.length).toBeGreaterThanOrEqual(32);
    expect(new Set(ORGANIZATION_COLORS.map(({ value }) => value)).size).toBe(ORGANIZATION_COLORS.length);
  });

  it('returns the same hashed color for equivalent organization input', () => {
    expect(hashOrganizationColor('АО НТЗ ТЭМ-ПО')).toBe(hashOrganizationColor('  ао нтз тэм-по  '));
    expect(ORGANIZATION_COLORS.some(({ value }) => value === hashOrganizationColor('АО НТЗ ТЭМ-ПО'))).toBe(true);
  });

  it('converts legacy Tailwind colors to the new HEX format', () => {
    expect(normalizeOrganizationColor('bg-green-50 text-green-700 ring-green-600/20')).toBe('#0F9D58');
    expect(normalizeOrganizationColor('#0f9d58')).toBe('#0F9D58');
  });

  it('chooses readable text for light and dark organization colors', () => {
    expect(getOrganizationTextColor('#D97706')).toBe('#102F4A');
    expect(getOrganizationTextColor('#1E3A8A')).toBe('#FFFFFF');
  });
});
