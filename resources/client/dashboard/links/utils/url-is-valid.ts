type Options = {
  checkForDomain?: boolean;
};
export function urlIsValid(
  url: string | undefined | null,
  options?: Options,
): boolean {
  if (!url) return false;

  if (!url.match(/^[a-zA-Z]+:\/\//)) {
    url = 'https://' + url;
  }

  try {
    const urlObject = new URL(url);
    if (options?.checkForDomain) {
      const parts = urlObject.hostname.split('.');
      const domain = parts.at(-1);
      return parts.length > 1 && !!domain && /^[a-zA-Z]{2,}$/.test(domain);
    } else {
      return true;
    }
  } catch {
    //
  }

  return false;
}
