export interface ActiveDirectoryPath {
  raw: string;
  domain: string;
  path: string;
  hierarchy: string[];
}

export function cleanProfileValue(value: string | null | undefined): string {
  return !value || value === '[]' ? '' : value;
}

export function formatActiveDirectoryPath(dn: string | null | undefined): ActiveDirectoryPath {
  if (!dn) {
    return { raw: '', domain: '', path: '', hierarchy: [] };
  }

  const organizationalUnits: string[] = [];
  const domainComponents: string[] = [];
  let commonName = '';

  for (const part of dn.split(',').map((value) => value.trim())) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = part.slice(0, separatorIndex).toUpperCase();
    const value = part.slice(separatorIndex + 1);

    if (key === 'OU') organizationalUnits.unshift(value);
    if (key === 'CN') commonName = value;
    if (key === 'DC') domainComponents.push(value);
  }

  const hierarchy = [...organizationalUnits, commonName].filter(Boolean);

  return {
    raw: dn,
    domain: domainComponents.join('.'),
    path: hierarchy.join(' ➔ '),
    hierarchy,
  };
}
