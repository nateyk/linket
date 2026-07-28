import {ImageWidget} from '@app/dashboard/biolink/biolink-editor/content/widgets/image-widget/image-widget-dialog';
import {WidgetRendererProps} from '@app/dashboard/biolink/biolink-editor/content/widgets/widget-renderer-props';
import {cn} from '@ui/utils/cn';
import {UserIcon} from 'lucide-react';

export function ImageWidgetRenderer({
  widget,
  variant,
}: WidgetRendererProps<ImageWidget>) {
  const image = widget.config.url ? (
    <img
      className={cn('object-cover', getImageClassName({widget, variant}))}
      src={widget.config.url}
      alt=""
    />
  ) : (
    <div
      className={cn(
        getImageClassName({widget, variant}),
        'flex items-center justify-center bg-muted',
      )}
    >
      <UserIcon
        className={cn(
          variant === 'editor' ? 'size-3' : 'size-10',
          'text-muted-foreground',
        )}
      />
    </div>
  );

  if (widget.config.destinationUrl) {
    return <a href={widget.config.destinationUrl}>{image}</a>;
  }
  return image;
}

function getImageClassName({
  widget,
  variant,
}: WidgetRendererProps<ImageWidget>) {
  const type = widget.config.type;
  if (variant === 'editor') {
    return `size-5 ${type === 'avatar' ? 'rounded-full' : 'rounded-sm'}`;
  } else if (type === 'avatar') {
    return 'size-24 rounded-full mx-auto';
  }
  return 'size-full rounded-sm block';
}
