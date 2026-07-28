import {Toggle} from '@shadcn/toggle';
import {ToggleGroup} from '@shadcn/toggle-group/toggle-group';
import {useLocalStorage} from '@ui/utils/hooks/local-storage';
import {ListIcon, StretchHorizontalIcon} from 'lucide-react';

const linksViewModeLocalStorageKey = 'linksViewMode';

export type LinksDataTableViewMode = 'cards' | 'rows';

export function LinksDataTableViewModeButton() {
  const [viewMode, setViewMode] = useLinksDataTableViewMode();
  return (
    <ToggleGroup
      variant="segmented"
      buttonVariant="ghost"
      value={[viewMode]}
      onValueChange={value => setViewMode(value[0] as LinksDataTableViewMode)}
    >
      <Toggle value="cards">
        <StretchHorizontalIcon />
      </Toggle>
      <Toggle value="rows">
        <ListIcon />
      </Toggle>
    </ToggleGroup>
  );
}

export function useLinksDataTableViewMode() {
  return useLocalStorage<LinksDataTableViewMode>(
    linksViewModeLocalStorageKey,
    'cards',
  );
}
