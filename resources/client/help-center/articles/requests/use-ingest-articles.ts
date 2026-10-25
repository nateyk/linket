import {aiAgentQueries} from '@ai/ai-agent/ai-agent-queries';
import {helpCenterQueries} from '@app/help-center/help-center-queries';
import {apiClient, queryClient} from '@common/http/query-client';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {useMutation} from '@tanstack/react-query';
import {toast} from '@ui/toast/toast';
import {useParams} from 'react-router';

interface Payload {
  all?: true;
  articleIds?: (number | string)[];
}

export function useIngestArticles() {
  const {aiAgentId} = useParams();
  return useMutation({
    mutationFn: (payload: Payload) => {
      return apiClient
        .post('lc/ai-agent/articles/ingest', {
          ...payload,
          ...(aiAgentId ? {aiAgentId: Number(aiAgentId)} : {}),
        })
        .then(r => r.data);
    },
    onSuccess: () => {
      toast({message: 'Enabled articles for AI agent'});
      return Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: aiAgentQueries.knowledge.invalidateKey,
        }),
        queryClient.invalidateQueries({
          queryKey: helpCenterQueries.articles.invalidateKey,
        }),
      ]);
    },
    onError: r => showHttpErrorToast(r),
  });
}
