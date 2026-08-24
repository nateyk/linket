import {SoundcloudWidget} from '@app/dashboard/stores/store-editor/content/widgets/soundcloud-widget/soundcloud-widget-dialog';
import {VideoEmbedWidgetRenderer} from '@app/dashboard/stores/store-editor/content/widgets/video-embed-widget-renderer';
import {WidgetRendererProps} from '@app/dashboard/stores/store-editor/content/widgets/widget-renderer-props';

export function SoundcloudWidgetRenderer({
  widget,
  variant,
}: WidgetRendererProps<SoundcloudWidget>) {
  if (!widget.config.url) return null;
  return (
    <VideoEmbedWidgetRenderer
      variant={variant}
      embedUrl={widget.config.embedUrl}
    />
  );
}
