export type NormalizedSearchParams = Record<string, string | string[]>;

export function searchParamsFromUrl(url: string) {
  const urlObject = new URL(url);
  return searchParamsToObject(urlObject.searchParams);
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
