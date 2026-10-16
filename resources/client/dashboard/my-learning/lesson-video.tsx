import {
  VideoPlayer,
  VideoPlayerContent,
  VideoPlayerControlBar,
  VideoPlayerMuteButton,
  VideoPlayerPlayButton,
  VideoPlayerSeekBackwardButton,
  VideoPlayerSeekForwardButton,
  VideoPlayerTimeDisplay,
  VideoPlayerTimeRange,
  VideoPlayerVolumeRange,
} from '@app/courses/video-player/video-player';
import {buildPrivacyEmbedUrl} from '@app/courses/video-player/privacy-embed-url';
import {Trans} from '@ui/i18n/trans';

export function LessonVideo({
  title,
  videoUrl,
  fileUrl,
}: {
  title: string;
  videoUrl?: string | null;
  fileUrl?: string | null;
}) {
  if (fileUrl) {
    return (
      <VideoPlayer>
        <VideoPlayerContent src={fileUrl} preload="metadata" />
        <VideoPlayerControlBar>
          <VideoPlayerPlayButton />
          <VideoPlayerSeekBackwardButton />
          <VideoPlayerSeekForwardButton />
          <VideoPlayerTimeRange />
          <VideoPlayerTimeDisplay showDuration={true} />
          <VideoPlayerMuteButton />
          <VideoPlayerVolumeRange />
        </VideoPlayerControlBar>
      </VideoPlayer>
    );
  }

  if (videoUrl) {
    // Host iframe chrome (Share / host watch UI) is outside Linket control.
    const src = buildPrivacyEmbedUrl(videoUrl);
    return (
      <div className="aspect-video overflow-hidden rounded-card border border-border bg-muted">
        <iframe
          src={src}
          className="size-full"
          allowFullScreen
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-video items-center justify-center rounded-card border border-border bg-muted text-sm text-muted-foreground">
      <Trans message="No video available for this lesson." />
    </div>
  );
}
