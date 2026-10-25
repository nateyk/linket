import {ControlledBackendFilter, FilterControl} from '../backend-filter';

export interface FilterPanelProps<T extends FilterControl = FilterControl> {
  filter: ControlledBackendFilter<T>;
}
