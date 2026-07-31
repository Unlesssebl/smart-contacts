import { describe, expect, it } from 'vitest';
import { cleanProfileValue, formatActiveDirectoryPath } from './profileValues';

describe('cleanProfileValue', () => {
  it.each([undefined, null, '', '[]'])('normalizes %s to an empty string', (value) => {
    expect(cleanProfileValue(value)).toBe('');
  });

  it('keeps a meaningful value unchanged', () => {
    expect(cleanProfileValue('+7 999 123-45-67')).toBe('+7 999 123-45-67');
  });
});

describe('formatActiveDirectoryPath', () => {
  it('builds a readable hierarchy and domain from a distinguished name', () => {
    expect(formatActiveDirectoryPath('CN=Иван Иванов,OU=IT,OU=Москва,DC=corp,DC=local')).toEqual({
      raw: 'CN=Иван Иванов,OU=IT,OU=Москва,DC=corp,DC=local',
      domain: 'corp.local',
      path: 'Москва ➔ IT ➔ Иван Иванов',
      hierarchy: ['Москва', 'IT', 'Иван Иванов'],
    });
  });

  it('returns an empty structure when the DN is absent', () => {
    expect(formatActiveDirectoryPath(null)).toEqual({
      raw: '',
      domain: '',
      path: '',
      hierarchy: [],
    });
  });
});
