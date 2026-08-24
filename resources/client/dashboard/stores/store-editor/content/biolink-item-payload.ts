export interface BiolinkItemPayload {
  animation?: string | null;
  image?: string | null;
  active?: boolean;
  expires_at?: string;
  activates_at?: string;
  leap_until?: string;
  pinned?: 'top' | null;
}
