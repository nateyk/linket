import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';

export interface WidgetRendererProps<T extends BiolinkWidget = BiolinkWidget> {
  widget: T;
  variant: 'editor' | 'biolinkPage';
}
