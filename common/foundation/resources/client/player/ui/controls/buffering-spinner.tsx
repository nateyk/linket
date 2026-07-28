import {usePlayerStore} from '@common/player/hooks/use-player-store';
import {
  ProgressCircle,
  ProgressCircleProps,
} from '@ui/progress/progress-circle';

interface Props {
  className?: string;
  size?: ProgressCircleProps['size'];
}
export function BufferingSpinner({className, size}: Props) {
  const isActive = usePlayerStore(
    s =>
      // YouTube will already show a spinner, no need for a custom one
      (s.isBuffering && s.providerName !== 'youtube') ||
      (s.playbackStarted && !s.providerReady),
  );
  return isActive ? (
    <ProgressCircle isIndeterminate className={className} size={size} />
  ) : null;
}
