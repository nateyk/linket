export type NormalizedSearchParams = Record<string, string | string[]>;

/**
 * Route loaders consume single-value params. Repeated params are collapsed to
 * the first value; use `searchParamsToObject` when arrays are required.
 */
export function searchParamsFromUrl(url: string): Record<string, string> {
  const urlObject = new URL(url);
  const params: Record<string, string> = {};

  for (const key of new Set(urlObject.searchParams.keys())) {
    params[key] = urlObject.searchParams.get(key) ?? '';
  }

  return params;
}

export function searchParamsToObject(searchParams: URLSearchParams) {
  const uniqueKeys = new Set(searchParams.keys());

  const params: Record<string, string | string[]> = {};
  for (const key of uniqueKeys) {
    const ov = searchParams.getAll(key);
    const values = ov.length > 1 ? ov : ov[0];
    params[key] = values;
  }

  return params;
}
