'use client';

import {
  MediaController,
  MediaControlBar,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaVolumeRange,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaMuteButton,
} from 'media-chrome/react';
import {cn} from '@ui/utils/cn';
import type {ComponentProps, VideoHTMLAttributes} from 'react';
import './video-player.css';

export function VideoPlayer({
  className,
  ...props
}: ComponentProps<typeof MediaController>) {
  return (
    <MediaController
      className={cn('video-player-root', className)}
      {...props}
    />
  );
}

export function VideoPlayerContent({
  className,
  ...props
}: VideoHTMLAttributes<HTMLVideoElement>) {
  return (
    <video
      slot="media"
      className={cn(className)}
      playsInline
      {...props}
    />
  );
}

export function VideoPlayerControlBar(
  props: ComponentProps<typeof MediaControlBar>,
) {
  return <MediaControlBar {...props} />;
}

export function VideoPlayerPlayButton(
  props: ComponentProps<typeof MediaPlayButton>,
) {
  return <MediaPlayButton {...props} />;
}

export function VideoPlayerSeekBackwardButton(
  props: ComponentProps<typeof MediaSeekBackwardButton>,
) {
  return <MediaSeekBackwardButton seekOffset={10} {...props} />;
}

export function VideoPlayerSeekForwardButton(
  props: ComponentProps<typeof MediaSeekForwardButton>,
) {
  return <MediaSeekForwardButton seekOffset={10} {...props} />;
}

export function VideoPlayerTimeRange(
  props: ComponentProps<typeof MediaTimeRange>,
) {
  return <MediaTimeRange {...props} />;
}

export function VideoPlayerTimeDisplay(
  props: ComponentProps<typeof MediaTimeDisplay>,
) {
  return <MediaTimeDisplay {...props} />;
}

export function VideoPlayerMuteButton(
  props: ComponentProps<typeof MediaMuteButton>,
) {
  return <MediaMuteButton {...props} />;
}

export function VideoPlayerVolumeRange(
  props: ComponentProps<typeof MediaVolumeRange>,
) {
  return <MediaVolumeRange {...props} />;
}
