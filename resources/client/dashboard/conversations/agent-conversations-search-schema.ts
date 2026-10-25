import {castObjectValuesToString} from '@ui/utils/objects/cast-object-values-to-string';

export type AgentConversationsSearchParams = {
  page: string;
  orderBy: string;
  orderDir: string;
  query: string;
  filters: string;
  viewId: string;
  scope?: string;
};

function validateSharedParams(search: Record<string, unknown>) {
  return {
    page: search.page || '1',
    orderBy: search.orderBy || '',
    orderDir: search.orderDir || '',
    query: search.query || '',
    filters: search.filters || '',
  };
}

export const validateAgentConversationsSearch = (
  search: Record<string, unknown>,
): AgentConversationsSearchParams => {
  return castObjectValuesToString({
    ...validateSharedParams(search),
    viewId: search.viewId || 'all',
    ...(search.scope ? {scope: `${search.scope}`} : {}),
  });
};

export const validateSearchConversationsParams = (
  search: Record<string, unknown>,
): Omit<AgentConversationsSearchParams, 'viewId'> => {
  return castObjectValuesToString(validateSharedParams(search));
};
