export const PORTAL_SECTIONS = [
  'overview',
  'courses',
  'downloads',
  'audio',
  'orders',
  'settings',
] as const;

export type PortalSection = (typeof PORTAL_SECTIONS)[number];

export function parsePortalSection(
  raw: string | null | undefined,
): PortalSection {
  if (raw && (PORTAL_SECTIONS as readonly string[]).includes(raw)) {
    return raw as PortalSection;
  }
  return 'overview';
}
