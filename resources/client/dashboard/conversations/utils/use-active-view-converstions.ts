import {
  AgentConversationsSearchParams,
  validateAgentConversationsSearch,
} from '@app/dashboard/conversations/agent-conversations-search-schema';
import {useCreatorSupportInbox} from '@app/dashboard/conversations/creator-support-inbox-context';
import {helpdeskQueries} from '@app/dashboard/helpdesk-queries';
import {useDatatableSearchParams} from '@common/datatable/filters/utils/use-datatable-search-params';
import {useInfiniteQuery, useQuery} from '@tanstack/react-query';
import {useMemo} from 'react';

export function useActiveViewConversations() {
  const isCreatorInbox = useCreatorSupportInbox();
  const {searchParams, mergeIntoSearchParams, sortDescriptor} =
    useDatatableSearchParams<AgentConversationsSearchParams>(
      validateAgentConversationsSearch,
    );

  const inboxSearchParams = isCreatorInbox
    ? {...searchParams, scope: 'creator'}
    : searchParams;

  const query = useQuery(
    helpdeskQueries.conversations.index(inboxSearchParams),
  );
  const {data, isLoading, isPlaceholderData} = query;
  const items = data?.pagination.data || [];
  const isEmpty = !isLoading && !isPlaceholderData && items.length === 0;

  return {
    query,
    items,
    isEmpty,
    searchParams,
    mergeIntoSearchParams,
    sortDescriptor,
  };
}

export function useInfiniteActiveViewConverations() {
  const isCreatorInbox = useCreatorSupportInbox();
  const {searchParams} =
    useDatatableSearchParams<AgentConversationsSearchParams>(
      validateAgentConversationsSearch,
    );

  const inboxSearchParams = isCreatorInbox
    ? {...searchParams, scope: 'creator'}
    : searchParams;

  const query = useInfiniteQuery(
    helpdeskQueries.conversations.infiniteIndex(inboxSearchParams),
  );

  const {data} = query;
  const items = useMemo(() => {
    return data?.pages.flatMap(p => p.pagination.data) || [];
  }, [data]);
  const isEmpty = data?.pages?.[0].pagination.data.length === 0;

  return {
    query,
    items,
    isEmpty,
  };
}
