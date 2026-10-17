import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {Biolink} from '@app/gen/schemas/biolink';
import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';

export interface WidgetRendererProps<T extends BiolinkWidget = BiolinkWidget> {
  widget: T;
  variant: 'editor' | 'biolinkPage';
  biolink?: Biolink;
  /** Live draft from the preview postMessage channel; falls back to saved config. */
  appearance?: BiolinkAppearanceConfig | null;
}
