import {WidgetRendererProps} from '@app/dashboard/stores/store-editor/content/widgets/widget-renderer-props';
import {RemoteFavicon} from '@common/ui/other/remote-favicon';

interface VideoEmbedWidgetRenderer {
  variant: WidgetRendererProps['variant'];
  embedUrl: string;
}
export function VideoEmbedWidgetRenderer({
  variant,
  embedUrl,
}: VideoEmbedWidgetRenderer) {
  if (!embedUrl) return null;

  if (variant === 'editor') {
    return (
      <div className="flex max-w-[80%] min-w-0 items-center gap-2 truncate">
        <RemoteFavicon url={embedUrl} />
        <a
          href={embedUrl}
          target="_blank"
          className="truncate text-sm text-muted-foreground hover:underline"
          rel="noreferrer"
        >
          {embedUrl}
        </a>
      </div>
    );
  }
  return (
    <iframe
      className="aspect-video w-full rounded-sm shadow-lg"
      loading="lazy"
      src={embedUrl}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}
