import {aiAgentQueries} from '@ai/ai-agent/ai-agent-queries';
import {useSuspenseQuery} from '@tanstack/react-query';
import {getFromLocalStorage} from '@ui/utils/hooks/local-storage';

const localStorageKey = 'ai-agent-settings-selected-agent-id';

/**
 * The AI addon in this build exposes a single agent configured through
 * `aiAgent` settings, not the multi-agent list newer BeDesk builds use.
 */
export function getSelectedAiAgentId(): string {
  return getFromLocalStorage(localStorageKey) ?? '1';
}

export function useSelectedAiAgent() {
  const {data} = useSuspenseQuery(aiAgentQueries.settings.index());
  const settings = data.settings as Record<string, any>;

  return {
    id: 1,
    name: settings.name,
    image: settings.image,
    ...settings,
  };
}
