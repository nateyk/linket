import {ImageWidgetDialog} from '@app/dashboard/stores/store-editor/content/widgets/image-widget/image-widget-dialog';
import {SocialsWidgetDialog} from '@app/dashboard/stores/store-editor/content/widgets/socials-widget/socials-widget-dialog';
import {SoundcloudWidgetDialog} from '@app/dashboard/stores/store-editor/content/widgets/soundcloud-widget/soundcloud-widget-dialog';
import {SpotifyWidgetDialog} from '@app/dashboard/stores/store-editor/content/widgets/spotify-widget/spotify-widget-dialog';
import {TextWidgetDialog} from '@app/dashboard/stores/store-editor/content/widgets/text-widget/text-widget-dialog';
import {TiktokWidgetDialog} from '@app/dashboard/stores/store-editor/content/widgets/tiktok-widget/tiktok-widget-dialog';
import {TwitchWidgetDialog} from '@app/dashboard/stores/store-editor/content/widgets/twitch-widget/twitch-widget-dialog';
import {VimeoWidgetDialog} from '@app/dashboard/stores/store-editor/content/widgets/vimeo-widget/vimeo-widget-dialog';
import {YoutubeWidgetDialog} from '@app/dashboard/stores/store-editor/content/widgets/youtube-widget/youtube-widget-dialog';
import {ShopWidgetDialog} from '@app/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-dialog';
import {BiolinkWidget} from '@app/gen/schemas/biolink-widget';
import {Trans} from '@ui/i18n/trans';
import {JSXElementConstructor, ReactNode} from 'react';
import imageThumbnail from './widget-selector/widget-images/image.png';
import socialsImage from './widget-selector/widget-images/socials.png';
import soundcloudImage from './widget-selector/widget-images/soundcloud.png';
import spotifyImage from './widget-selector/widget-images/spotify.png';
import textImage from './widget-selector/widget-images/text.png';
import tiktokImage from './widget-selector/widget-images/tiktok.png';
import twitchImage from './widget-selector/widget-images/twitch.svg';
import vimeoImage from './widget-selector/widget-images/vimeo.jpeg';
import youtubeImage from './widget-selector/widget-images/youtube.png';

export interface WidgetListItem {
  name: ReactNode;
  description: ReactNode;
  image?: string;
  dialog: JSXElementConstructor<any>;
}

export const WidgetList: Record<BiolinkWidget['type'], WidgetListItem> = {
  image: {
    name: <Trans message="Image" />,
    image: imageThumbnail,
    description: (
      <Trans message="Upload an image and optionally add a link it will redirect to when clicked." />
    ),
    dialog: ImageWidgetDialog,
  },
  text: {
    name: <Trans message="Text" />,
    image: textImage,
    description: (
      <Trans message="Add title and optional description. Can be used as a header for the whole biolink or a group of multiple widgets." />
    ),
    dialog: TextWidgetDialog,
  },
  socials: {
    name: <Trans message="Social Links" />,
    image: socialsImage,
    description: (
      <Trans message="Add your socials links to display them as icon buttons." />
    ),
    dialog: SocialsWidgetDialog,
  },
  youtube: {
    name: <Trans message="Youtube Video" />,
    image: youtubeImage,
    description: (
      <Trans message="Paste a YouTube video URL to show it as a video embed in your profile." />
    ),
    dialog: YoutubeWidgetDialog,
  },
  soundcloud: {
    name: <Trans message="Soundcloud Audio" />,
    image: soundcloudImage,
    description: (
      <Trans message="Paste a SoundCloud URL to show it as a playable song in your profile." />
    ),
    dialog: SoundcloudWidgetDialog,
  },
  vimeo: {
    name: <Trans message="Vimeo Video" />,
    image: vimeoImage,
    description: (
      <Trans message="Paste a vimeo URL to show it as a video embed in your profile." />
    ),
    dialog: VimeoWidgetDialog,
  },
  spotify: {
    name: <Trans message="Spotify Embed" />,
    image: spotifyImage,
    description: (
      <Trans message="Paste a spotify song, album, artist, playlist, podcast or episode url to show it as an embed in your profile." />
    ),
    dialog: SpotifyWidgetDialog,
  },
  twitch: {
    name: <Trans message="Twitch Embed" />,
    image: twitchImage,
    description: (
      <Trans message="Paste twitch profile or clip url to show it as an embed in your profile." />
    ),
    dialog: TwitchWidgetDialog,
  },
  tiktok: {
    name: <Trans message="TikTok Embed" />,
    image: tiktokImage,
    description: (
      <Trans message="Paste TikTok video url to show it as an embed in your profile." />
    ),
    dialog: TiktokWidgetDialog,
  },
  shop: {
    name: <Trans message="Digital Products" />,
    description: <Trans message="Display approved digital products selected from your product manager." />,
    dialog: ShopWidgetDialog,
  },
};
