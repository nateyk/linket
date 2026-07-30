import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {Biolink} from '@app/gen/schemas/biolink';

export interface WidgetRendererProps<T extends BiolinkWidget = BiolinkWidget> {
  widget: T;
  variant: 'editor' | 'biolinkPage';
  biolink?: Biolink;
}
