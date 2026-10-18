export type ServiceContactChannel = {
  type: 'whatsapp' | 'telegram' | 'email' | 'phone' | 'link';
  label?: string;
  value: string;
};

export function contactChannelHref(
  channel: ServiceContactChannel,
): string | null {
  const value = channel.value.trim();
  if (!value) return null;

  switch (channel.type) {
    case 'whatsapp': {
      const digits = value.replace(/\D/g, '');
      return digits.length >= 6 ? `https://wa.me/${digits}` : null;
    }
    case 'telegram': {
      const handle = value.replace(/^@/, '').trim();
      return /^[a-zA-Z0-9_]{3,}$/.test(handle)
        ? `https://t.me/${handle}`
        : null;
    }
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? `mailto:${value}`
        : null;
    case 'phone': {
      const phone = value.replace(/[^\d+]/g, '');
      return phone.replace(/\D/g, '').length >= 6 ? `tel:${phone}` : null;
    }
    case 'link': {
      try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol)
          ? url.toString()
          : null;
      } catch {
        return null;
      }
    }
    default:
      return null;
  }
}
