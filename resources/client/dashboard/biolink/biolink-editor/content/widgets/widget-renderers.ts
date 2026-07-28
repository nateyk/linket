import {ImageWidgetRenderer} from '@app/dashboard/biolink/biolink-editor/content/widgets/image-widget/image-widget-renderer';
import {SocialsWidgetRenderer} from '@app/dashboard/biolink/biolink-editor/content/widgets/socials-widget/socials-widget-renderer';
import {SoundcloudWidgetRenderer} from '@app/dashboard/biolink/biolink-editor/content/widgets/soundcloud-widget/soundcloud-widget-renderer';
import {SpotifyWidgetRenderer} from '@app/dashboard/biolink/biolink-editor/content/widgets/spotify-widget/spotify-widget-renderer';
import {TextWidgetRenderer} from '@app/dashboard/biolink/biolink-editor/content/widgets/text-widget/text-widget-renderer';
import {TiktokWidgetRenderer} from '@app/dashboard/biolink/biolink-editor/content/widgets/tiktok-widget/tiktok-widget-renderer';
import {TwitchWidgetRenderer} from '@app/dashboard/biolink/biolink-editor/content/widgets/twitch-widget/twitch-widget-renderer';
import {VimeoWidgetRenderer} from '@app/dashboard/biolink/biolink-editor/content/widgets/vimeo-widget/vimeo-widget-renderer';
import {WidgetRendererProps} from '@app/dashboard/biolink/biolink-editor/content/widgets/widget-renderer-props';
import {YoutubeWidgetRenderer} from '@app/dashboard/biolink/biolink-editor/content/widgets/youtube-widget/youtube-widget-renderer';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {JSXElementConstructor} from 'react';

export const WidgetRenderers: Record<
  BiolinkWidget['type'],
  JSXElementConstructor<WidgetRendererProps<any>>
> = {
  image: ImageWidgetRenderer,
  text: TextWidgetRenderer,
  socials: SocialsWidgetRenderer,
  youtube: YoutubeWidgetRenderer,
  soundcloud: SoundcloudWidgetRenderer,
  vimeo: VimeoWidgetRenderer,
  spotify: SpotifyWidgetRenderer,
  twitch: TwitchWidgetRenderer,
  tiktok: TiktokWidgetRenderer,
};
