import {BackendResponse} from './backend-response';

export const defaultPerPage = 15;
export const perPageOptions = [{key: 15}, {key: 30}, {key: 60}, {key: 100}];

export type SimplePaginationMeta = {
  from: number | null;
  to: number | null;
  per_page: number;
  current_page: number;
  next_page?: number | null;
  prev_page?: number | null;
};

export type LengthAwarePaginationMeta = SimplePaginationMeta & {
  total: number;
  last_page: number;
};

export type CursorPaginationMeta = {
  next_cursor: string | null;
  prev_cursor: string | null;
  per_page: number;
};

export type PaginationMeta =
  | SimplePaginationMeta
  | LengthAwarePaginationMeta
  | CursorPaginationMeta;

export type PaginationLinks = {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
};

export type PaginatedResource<T = unknown> = {
  data: T[];
  meta: PaginationMeta;
  links: PaginationLinks;
};

export function hasPreviousPage(meta: PaginationMeta): boolean {
  if ('prev_cursor' in meta) {
    return meta.prev_cursor != null;
  }

  if ('prev_page' in meta) {
    return meta.prev_page != null;
  }

  return meta.current_page > 1;
}

export function hasNextPage(meta: PaginationMeta): boolean {
  if ('next_cursor' in meta) {
    return meta.next_cursor != null;
  }

  if ('last_page' in meta) {
    return meta.current_page < (meta as LengthAwarePaginationMeta).last_page;
  }

  if ('next_page' in meta) {
    return meta.next_page != null;
  }

  return false;
}

export function getPreviousPageParam(
  response: PaginatedResource,
): number | string | null {
  if (!response.links.prev) {
    return null;
  }

  if ('prev_cursor' in response.meta) {
    return response.meta.prev_cursor;
  }

  return response.meta.current_page - 1;
}

export function getNextPageParam(
  response: PaginatedResource,
): number | string | null {
  if (!response.links.next) {
    return null;
  }

  if ('next_cursor' in response.meta) {
    return response.meta.next_cursor;
  }
  return response.meta.current_page + 1;
}

// legacy, use PaginatedResource and PaginationMeta instead
export type LengthAwarePaginationResponse<T = unknown> =
  LengthAwarePaginationMeta & {
    data: T[];
  };

export type SimplePaginationResponse<T = unknown> = SimplePaginationMeta & {
  data: T[];
};

export type CursorPaginationResponse<T> = CursorPaginationMeta & {
  data: T[];
};

export type PaginationResponse<T> =
  | LengthAwarePaginationResponse<T>
  | SimplePaginationResponse<T>
  | CursorPaginationResponse<T>;

export interface PaginatedBackendResponse<T> extends BackendResponse {
  pagination: PaginationResponse<T>;
}

export const EMPTY_PAGINATION_RESPONSE = {
  pagination: {data: [], from: 0, to: 0, per_page: 15, current_page: 1},
};
