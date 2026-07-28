import {castObjectValuesToString} from '@ui/utils/objects/cast-object-values-to-string';

type LinksSearchParams = {
  page: string;
  orderBy: string;
  orderDir: string;
  query: string;
  filters: string;
  workspaceId?: string;
  userId?: string;
  folderId?: string;
};

export const validateLinksSearch = (
  search: Record<string, unknown>,
): LinksSearchParams => {
  return castObjectValuesToString({
    page: search.page || '1',
    orderBy: search.orderBy || '',
    orderDir: search.orderDir || '',
    query: search.query || '',
    filters: search.filters || '',
    folderId: search.folderId || '',
  });
};
