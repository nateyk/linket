import {TiktokWidget} from '@app/dashboard/stores/store-editor/content/widgets/tiktok-widget/tiktok-widget-dialog';
import {WidgetRendererProps} from '@app/dashboard/stores/store-editor/content/widgets/widget-renderer-props';
import {RemoteFavicon} from '@common/ui/other/remote-favicon';
import lazyLoader from '@ui/utils/loaders/lazy-loader';
import {useEffect} from 'react';
import tiktokImage from './tiktok.png';

export function TiktokWidgetRenderer({
  widget,
  variant,
}: WidgetRendererProps<TiktokWidget>) {
  useEffect(() => {
    lazyLoader.loadAsset('https://www.tiktok.com/embed.js', {type: 'js'});
  }, []);

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

  const embedURL = new URL(widget.config.url).pathname.split('/').pop()?.trim();
  return (
    <blockquote data-video-id={embedURL} className="tiktok-embed">
      <img src={tiktokImage} alt="" />
    </blockquote>
  );
}
