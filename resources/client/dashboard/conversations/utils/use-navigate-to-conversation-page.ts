import {useSupportInboxBasePath} from '@app/dashboard/conversations/creator-support-inbox-context';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useCallback} from 'react';
import {useSearchParams} from 'react-router';

export function useNavigateToConversationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inboxBasePath = useSupportInboxBasePath();
  return useCallback(
    (conversationId: number | string) => {
      let link = `${inboxBasePath}/conversations/${conversationId}`;
      if (searchParams.has('viewId')) {
        link += `?viewId=${searchParams.get('viewId')}`;
      }
      navigate(link);
    },
    [inboxBasePath, navigate, searchParams],
  );
}

export function useConversationLink(conversationId: number | string) {
  const [searchParams] = useSearchParams();
  const inboxBasePath = useSupportInboxBasePath();
  let link = `${inboxBasePath}/conversations/${conversationId}`;
  if (searchParams.has('viewId')) {
    link += `?viewId=${searchParams.get('viewId')}`;
  }
  return link;
}
