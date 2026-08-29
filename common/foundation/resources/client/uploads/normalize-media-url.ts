export function normalizeMediaUrl(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('//')
  ) {
    return trimmed;
  }
  if (lower.startsWith('blob:') || lower.startsWith('data:')) {
    return '';
  }
  const ltrim = trimmed.replace(/^\/+/, '');
  if (ltrim.startsWith('storage/')) {
    return `/${ltrim}`;
  }
  return trimmed;
}
