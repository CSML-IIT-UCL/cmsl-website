export function normalizeBase(base: string): string {
  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function joinBase(base: string, path = ''): string {
  const normalizedBase = normalizeBase(base);
  const normalizedPath = path.replace(/^\/+/, '');
  return normalizedPath ? `${normalizedBase}${normalizedPath}` : normalizedBase;
}

export const withBase = (path = '') => joinBase(import.meta.env.BASE_URL, path);

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return withBase(path.replace(/^\/+/, ''));
}
