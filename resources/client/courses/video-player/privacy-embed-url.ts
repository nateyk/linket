export function buildPrivacyEmbedUrl(src: string): string {
  try {
    const url = new URL(src);
    const host = url.hostname.replace(/^www\./, '');
    const ytMatch =
      host.includes('youtube.com') || host.includes('youtube-nocookie.com')
        ? url.pathname.match(/\/embed\/([A-Za-z0-9_-]{6,})/)
        : host === 'youtu.be'
          ? url.pathname.match(/^\/([A-Za-z0-9_-]{6,})/)
          : null;
    if (ytMatch?.[1]) {
      const out = new URL(
        `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
      );
      out.searchParams.set('modestbranding', '1');
      out.searchParams.set('rel', '0');
      out.searchParams.set('playsinline', '1');
      return out.toString();
    }
    if (host.includes('vimeo.com')) {
      const id = url.pathname.match(/\/(?:video\/)?(\d+)/)?.[1];
      if (id) {
        const out = new URL(`https://player.vimeo.com/video/${id}`);
        out.searchParams.set('title', '0');
        out.searchParams.set('byline', '0');
        out.searchParams.set('portrait', '0');
        return out.toString();
      }
    }
  } catch {
    // fall through
  }
  return src;
}
