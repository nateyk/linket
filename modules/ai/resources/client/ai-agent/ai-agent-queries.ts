import {AiAgentSettings} from '@ai/ai-agent/settings/ai-agent-settings';
import {AiAgentTool} from '@ai/ai-agent/tools/ai-agent-tool';
import {validateDatatableSearch} from '@common/datatable/filters/utils/validate-datatable-search';
import {PaginatedBackendResponse} from '@common/http/backend-response/pagination-response';
import {get} from '@common/http/queries-file-helpers';
import {queryOptions} from '@tanstack/react-query';
import {AiAgentFlow, FlowAttachment} from './flows/ai-agent-flow';
import {AiAgentDocument} from './knowledge/documents/ai-agent-document';
import {AiAgentSnippet} from './knowledge/snippets/ai-agent-snippet';
import {Knowledge} from './knowledge/use-knowledge';
import {
  AiAgentWebpage,
  AiAgentWebsite,
} from './knowledge/websites/requests/ai-agent-website';

export const aiAgentQueries = {
  settings: {
    invalidateKey: ['aiAgent', 'settings'],
    index: () => {
      return queryOptions({
        queryKey: ['aiAgent', 'settings'],
        queryFn: () =>
          get<{
            settings: AiAgentSettings;
            flows: {id: number; name: string}[];
          }>('lc/ai-agent/settings'),
      });
    },
  },

  knowledge: {
    invalidateKey: ['aiAgent', 'knowledge'],
    index: () =>
      queryOptions({
        queryKey: ['aiAgent', 'knowledge'],
        queryFn: () => get<Knowledge>('lc/ai-agent/knowledge'),
      }),
  },

  snippets: {
    invalidateKey: ['aiAgent', 'knowledge'],
    index: (search: Record<string, string>) => {
      const params = validateDatatableSearch(search);
      return queryOptions({
        queryKey: ['aiAgent', 'knowledge', 'snippets', params],
        queryFn: ({signal}) =>
          get<PaginatedBackendResponse<AiAgentSnippet>>(
            'lc/ai-agent/snippets',
            params,
            signal,
          ),
      });
    },
    get: (snippetId: number | string) => {
      return queryOptions({
        queryKey: ['aiAgent', 'knowledge', 'snippets', snippetId],
        queryFn: () =>
          get<{snippet: AiAgentSnippet}>(`lc/ai-agent/snippets/${snippetId}`),
      });
    },
  },

  documents: {
    invalidateKey: ['aiAgent', 'knowledge'],
    index: (search: Record<string, string>) => {
      const params = validateDatatableSearch(search);
      return queryOptions({
        queryKey: ['aiAgent', 'knowledge', 'documents', params],
        queryFn: ({signal}) =>
          get<PaginatedBackendResponse<AiAgentDocument>>(
            'lc/ai-agent/documents',
            params,
            signal,
          ),
      });
    },
    get: (documentId: number | string) =>
      queryOptions({
        queryKey: ['aiAgent', 'knowledge', 'documents', documentId],
        queryFn: () =>
          get<{document: AiAgentDocument}>(
            `lc/ai-agent/documents/${documentId}`,
          ),
      }),
  },

  websites: {
    invalidateKey: ['aiAgent', 'knowledge'],
    index: (search: Record<string, string>) => {
      const params = validateDatatableSearch(search);
      return queryOptions({
        queryKey: ['aiAgent', 'knowledge', 'websites', params],
        queryFn: ({signal}) =>
          get<PaginatedBackendResponse<AiAgentWebsite>>(
            'lc/ai-agent/websites',
            params,
            signal,
          ),
      });
    },
  },

  webpages: {
    invalidateKey: ['aiAgent', 'knowledge'],
    index: (websiteId: number | string, search: Record<string, string>) => {
      const params = validateDatatableSearch(search);
      return queryOptions({
        queryKey: ['aiAgent', 'knowledge', 'webpages', `${websiteId}`, params],
        queryFn: ({signal}) =>
          get<
            PaginatedBackendResponse<AiAgentWebpage> & {website: AiAgentWebsite}
          >(`lc/ai-agent/websites/${websiteId}/webpages`, params, signal),
      });
    },
    get: (websiteId: number | string, webpageId: number | string) => {
      return queryOptions({
        queryKey: [
          'aiAgent',
          'knowledge',
          'webpages',
          `${websiteId}`,
          `${webpageId}`,
        ],
        queryFn: () =>
          get<{website: AiAgentWebsite; webpage: AiAgentWebpage}>(
            `lc/ai-agent/websites/${websiteId}/webpages/${webpageId}`,
          ),
      });
    },
  },

  flows: {
    invalidateKey: ['aiAgent', 'flows'],
    index: (search: Record<string, string>) => {
      const params = validateDatatableSearch(search);
      return queryOptions({
        queryKey: ['aiAgent', 'flows', params],
        queryFn: ({signal}) =>
          get<PaginatedBackendResponse<AiAgentFlow>>(
            'lc/ai-agent/flows',
            params,
            signal,
          ),
      });
    },
    list: () =>
      queryOptions({
        staleTime: Infinity,
        queryKey: ['aiAgent', 'flows', 'list'],
        queryFn: () =>
          get<{flows: {id: number; name: string}[]}>(`lc/ai-agent/flows/list`),
      }),
    get: (flowId: number | string) => {
      return queryOptions({
        queryKey: ['aiAgent', 'flows', flowId],
        staleTime: Infinity,
        queryFn: () => get<{flow: AiAgentFlow}>(`lc/ai-agent/flows/${flowId}`),
      });
    },
    indexAttachments: (flowId: number | string) => {
      return queryOptions({
        staleTime: Infinity,
        queryKey: ['aiAgent', 'flows', flowId, 'attachments'],
        queryFn: () =>
          get<{attachments: FlowAttachment[]}>(
            `lc/ai-agent/flows/${flowId}/attachments`,
          ),
      });
    },
  },

  tools: {
    invalidateKey: ['aiAgent', 'tools'],
    index: (search: Record<string, string>) => {
      const params = validateDatatableSearch(search);
      return queryOptions({
        queryKey: ['aiAgent', 'tools', 'index', params],
        queryFn: ({signal}) =>
          get<PaginatedBackendResponse<AiAgentTool>>(
            'lc/ai-agent/tools',
            params,
            signal,
          ),
      });
    },
    list: () =>
      queryOptions({
        staleTime: Infinity,
        queryKey: ['aiAgent', 'tools', 'list'],
        queryFn: () =>
          get<{tools: {id: number; name: string}[]}>(`lc/ai-agent/tools/list`),
      }),
    get: (toolId: number | string, loader?: 'editor' | 'simple') =>
      queryOptions({
        queryKey: ['aiAgent', 'tools', toolId, loader],
        staleTime: Infinity,
        queryFn: () =>
          get<{tool: AiAgentTool}>(
            `lc/ai-agent/tools/${toolId}?loader=${loader}`,
          ),
      }),
  },
};
