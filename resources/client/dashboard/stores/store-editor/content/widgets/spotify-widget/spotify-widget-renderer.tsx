import {formatEmbedURL} from '@app/dashboard/stores/store-editor/content/widgets/spotify-widget/spotify-uri';
import {SpotifyWidget} from '@app/dashboard/stores/store-editor/content/widgets/spotify-widget/spotify-widget-dialog';
import {WidgetRendererProps} from '@app/dashboard/stores/store-editor/content/widgets/widget-renderer-props';
import {RemoteFavicon} from '@common/ui/other/remote-favicon';
import clsx from 'clsx';

export function SpotifyWidgetRenderer({
  widget,
  variant,
}: WidgetRendererProps<SpotifyWidget>) {
  if (!widget.config.url) return null;

  if (variant === 'editor') {
    return (
      <div className="flex items-center gap-2">
        <RemoteFavicon url={widget.config.url} />
        <a
          href={widget.config.url}
          target="_blank"
          className="max-w-[80%] overflow-hidden text-sm text-ellipsis whitespace-nowrap text-muted-foreground hover:underline"
          rel="noreferrer"
        >
          {widget.config.url}
        </a>
      </div>
    );
  }

  const embedURL = formatEmbedURL(widget.config.url);
  return (
    <iframe
      className={clsx(
        'w-full rounded-sm shadow-lg',
        getEmbedHeight(widget.config.type),
      )}
      loading="lazy"
      src={embedURL}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
}

function getEmbedHeight(type?: string) {
  switch (type) {
    case 'track':
      return 'h-20';
    default:
      return 'h-38';
  }
}
