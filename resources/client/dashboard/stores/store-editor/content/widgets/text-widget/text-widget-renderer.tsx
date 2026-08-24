import {TextWidget} from '@app/dashboard/stores/store-editor/content/widgets/text-widget/text-widget-dialog';
import {WidgetRendererProps} from '@app/dashboard/stores/store-editor/content/widgets/widget-renderer-props';

export function TextWidgetRenderer({
  widget,
  variant,
}: WidgetRendererProps<TextWidget>) {
  if (!widget.config.title && !widget.config.description) return null;

  if (variant === 'editor') {
    return (
      <div className="overflow-hidden text-sm whitespace-nowrap text-muted-foreground">
        <div>{widget.config.title}</div>
        <div className="overflow-hidden text-ellipsis">
          {widget.config.description}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-7.5 text-center">
      <div className="text-base font-medium">{widget.config.title}</div>
      <div className="mt-2 text-sm">{widget.config.description}</div>
    </div>
  );
}
