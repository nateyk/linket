import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {
  resolveBiolinkButtonAppearance,
  resolveBiolinkContainerRadius,
} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Card} from '@shadcn/card/card';
import {Visualizer} from '@shadcn/visualizer';
import {ProductCover} from '@ui/product-cover';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {
  HeadphonesIcon,
  ListMusicIcon,
  Music2Icon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from 'lucide-react';
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type {
  PublicDigitalProduct,
  PublicProductSample,
} from '../digital-product-public-pages';
import {biolinkSurfaceCard} from './surface';

const WAVE_BARS = 56;

const waveform = Array.from({length: WAVE_BARS}, (_, index) => {
  const base = Math.sin(index * 0.5) * Math.cos(index * 0.17);
  const norm = (base + 1) / 2;
  return 0.25 + norm * 0.75;
});

type Player = ReturnType<typeof useSamplePlayer>;

const SamplePlayerContext = createContext<Player | null>(null);

export function ProductSamplePlayer({
  samples,
  children,
}: {
  samples: PublicProductSample[];
  children: ReactNode;
}) {
  const player = useSamplePlayer(samples);
  const current = samples[player.index];
  const needsCors = current?.url ? isCrossOriginUrl(current.url) : false;

  return (
    <SamplePlayerContext.Provider value={player}>
      {children}
      {current && (
        <audio
          ref={player.attachAudioRef}
          src={current.url}
          crossOrigin={needsCors ? 'anonymous' : undefined}
          preload="metadata"
          onPlay={() => player.setPlaying(true)}
          onPause={() => player.setPlaying(false)}
          onTimeUpdate={() => {
            const audio = player.audioRef.current;
            if (audio) player.setCurrentMs(audio.currentTime * 1000);
          }}
          onLoadedMetadata={() => {
            const audio = player.audioRef.current;
            if (audio && Number.isFinite(audio.duration)) {
              player.setDurationMs(audio.duration * 1000);
            }
          }}
          onEnded={() => {
            if (player.index + 1 < samples.length) {
              player.go(player.index + 1, true);
              return;
            }
            player.setPlaying(false);
          }}
        />
      )}
    </SamplePlayerContext.Provider>
  );
}

export function ProductSampleStage({
  product,
  appearance,
}: {
  product: PublicDigitalProduct;
  appearance?: BiolinkAppearanceConfig | null;
}) {
  const player = usePlayer();
  const samples = player.samples;
  const current = samples[player.index];
  if (!current) return null;

  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);
  const buttonVariant = appearance?.btnConfig?.variant ?? 'solid';
  const useAppearanceFace =
    buttonVariant !== 'outline' ||
    Boolean(appearance?.btnConfig?.color || appearance?.btnConfig?.textColor);
  const barStyle = waveformBarRadius[buttonAppearance.radius];

  return (
    <div className="relative overflow-hidden bg-[var(--biolink-surface)]">
      <div className="relative aspect-[4/3] sm:aspect-video">
        {product.cover?.url ? (
          <ProductCover
            cover={product.cover}
            alt={product.title}
            className="size-full"
            loading="eager"
          />
        ) : (
          <div className="size-full bg-[var(--biolink-surface-muted)]" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/15" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-4">
          <span className="inline-flex items-center gap-1.5 rounded-badge border border-white/20 bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
            <Music2Icon className="size-3" aria-hidden="true" />
            <Trans message="Free preview" />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-badge border border-white/20 bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white tabular-nums backdrop-blur-md">
            <HeadphonesIcon className="size-3" aria-hidden="true" />
            {player.index + 1}/{samples.length}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3.5 sm:p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-white/75 uppercase">
                <Trans message="Now previewing" />
              </p>
              <p className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
                {trackTitle(current)}
              </p>
            </div>
            <Visualizer
              source={player.audioEl}
              variant="bars"
              bars={28}
              mirror
              barRadiusRatio={barStyle.ratio}
              className={cn(
                'h-7 w-28 shrink-0 text-white transition-opacity sm:w-36',
                player.playing ? 'opacity-95' : 'opacity-65',
              )}
            />
          </div>
          <PreviewScrubber
            currentMs={player.currentMs}
            durationMs={player.durationMs}
            barBorderRadius={barStyle.css}
            label={player.trans(message('Preview progress'))}
            onSeek={player.seek}
          />
          <div className="flex items-center justify-between gap-3 pt-0.5">
            <span className="text-xs text-white/80 tabular-nums">
              {formatClock(player.currentMs)}
            </span>
            <div className="flex items-center gap-2">
              <TransportButton
                label={player.trans(message('Previous preview'))}
                disabled={player.index === 0}
                style={{boxShadow: buttonAppearance.style.boxShadow}}
                onClick={() => player.go(player.index - 1, player.playing)}
              >
                <SkipBackIcon className="size-4" aria-hidden="true" />
              </TransportButton>
              <TransportButton
                primary
                label={
                  player.playing
                    ? player.trans(message('Pause preview'))
                    : player.trans(message('Play preview'))
                }
                className={
                  useAppearanceFace
                    ? cn(
                        'border outline-1 -outline-offset-1 outline-white/20',
                        buttonAppearance.className,
                      )
                    : 'border border-white/75 bg-black/30 text-white backdrop-blur-md hover:bg-white/15'
                }
                style={
                  useAppearanceFace
                    ? buttonAppearance.style
                    : {boxShadow: buttonAppearance.style.boxShadow}
                }
                onClick={player.toggle}
              >
                {player.playing ? (
                  <PauseIcon className="size-4" aria-hidden="true" />
                ) : (
                  <PlayIcon className="ms-0.5 size-4" aria-hidden="true" />
                )}
              </TransportButton>
              <TransportButton
                label={player.trans(message('Next preview'))}
                disabled={player.index === samples.length - 1}
                style={{boxShadow: buttonAppearance.style.boxShadow}}
                onClick={() => player.go(player.index + 1, true)}
              >
                <SkipForwardIcon className="size-4" aria-hidden="true" />
              </TransportButton>
            </div>
            <span className="text-xs text-white/80 tabular-nums">
              {formatClock(player.durationMs)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductSampleTracklist({
  appearance,
}: {
  appearance?: BiolinkAppearanceConfig | null;
}) {
  const player = usePlayer();
  const containerRadius = resolveBiolinkContainerRadius(appearance);

  return (
    <Card.Root className={cn(biolinkSurfaceCard, containerRadius.className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-button border border-[var(--biolink-border)] bg-[var(--biolink-surface-muted)] text-[var(--biolink-text)]"
          >
            <ListMusicIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--biolink-text)]">
              <Trans message="Tracklist" />
            </h2>
            <p className="text-xs text-[var(--biolink-muted-text)]">
              <Trans
                message=":count free previews"
                values={{count: player.samples.length}}
              />
            </p>
          </div>
        </div>
      </div>
      <ul className="flex flex-col divide-y divide-[var(--biolink-border)] border-t border-[var(--biolink-border)]">
        {player.samples.map((sample, index) => {
          const active = index === player.index;
          return (
            <li key={sample.id}>
              <button
                type="button"
                className={cn(
                  'flex min-h-13 w-full items-center gap-3 px-4 py-2.5 text-start transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--biolink-text)] focus-visible:outline-none sm:px-5',
                  active
                    ? 'bg-[var(--biolink-surface-muted)]'
                    : 'hover:bg-[var(--biolink-surface)]',
                )}
                aria-current={active ? 'true' : undefined}
                onClick={() => player.go(index, true)}
              >
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-button border border-[var(--biolink-border)]',
                    active
                      ? 'bg-[var(--biolink-text)] text-[var(--biolink-surface-strong)]'
                      : 'bg-[var(--biolink-surface-strong)] text-[var(--biolink-text)]',
                  )}
                >
                  {active && player.playing ? (
                    <PauseIcon className="size-3.5" aria-hidden="true" />
                  ) : (
                    <PlayIcon className="ms-px size-3.5" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-sm text-[var(--biolink-text)]',
                      active ? 'font-semibold' : 'font-medium',
                    )}
                  >
                    {trackTitle(sample)}
                  </span>
                  <span className="block text-xs text-[var(--biolink-muted-text)]">
                    <Trans message="Free preview" />
                  </span>
                </span>
                <span className="w-10 shrink-0 text-end text-xs tabular-nums text-[var(--biolink-muted-text)]">
                  {sample.duration_ms
                    ? formatClock(sample.duration_ms)
                    : active && player.durationMs
                      ? formatClock(player.durationMs)
                      : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-[var(--biolink-border)] bg-[var(--biolink-surface)] px-4 py-2.5 text-xs text-[var(--biolink-muted-text)] sm:px-5">
        <Trans message="Full pack unlocked after purchase" />
      </p>
    </Card.Root>
  );
}

function usePlayer(): Player {
  const player = useContext(SamplePlayerContext);
  if (!player) {
    throw new Error('Product sample player is missing its provider.');
  }
  return player;
}

function useSamplePlayer(samples: PublicProductSample[]) {
  const {trans} = useTrans();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const pendingPlay = useRef(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(samples[0]?.duration_ms ?? 0);

  const attachAudioRef = (node: HTMLAudioElement | null) => {
    audioRef.current = node;
    setAudioEl(node);
  };

  useEffect(() => {
    if (!pendingPlay.current) return;
    pendingPlay.current = false;
    void audioRef.current?.play().catch(() => setPlaying(false));
  }, [index]);

  const go = (next: number, autoplay: boolean) => {
    if (next < 0 || next >= samples.length) return;
    pendingPlay.current = autoplay;
    setCurrentMs(0);
    setDurationMs(samples[next]?.duration_ms ?? 0);
    setIndex(next);
    if (next === index && autoplay) {
      pendingPlay.current = false;
      void audioRef.current?.play().catch(() => setPlaying(false));
    }
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  };

  const seek = (ms: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = ms / 1000;
    setCurrentMs(ms);
  };

  return {
    samples,
    audioRef,
    audioEl,
    attachAudioRef,
    index,
    playing,
    setPlaying,
    currentMs,
    setCurrentMs,
    durationMs,
    setDurationMs,
    trans,
    toggle,
    go,
    seek,
  };
}

function trackTitle(sample: PublicProductSample): ReactNode {
  const title = sample.title?.trim();
  if (title) return title;
  return <Trans message="Preview" />;
}

const waveformBarRadius = {
  'rounded-none': {css: '0px', ratio: 0},
  'rounded-sm': {css: '1.5px', ratio: 0.2},
  'rounded-lg': {css: '3px', ratio: 0.38},
  'rounded-full': {css: '9999px', ratio: 0.5},
} as const;

function PreviewScrubber({
  currentMs,
  durationMs,
  barBorderRadius,
  label,
  onSeek,
}: {
  currentMs: number;
  durationMs: number;
  barBorderRadius: string;
  label: string;
  onSeek: (ms: number) => void;
}) {
  const max = Math.max(durationMs, 1);
  const value = Math.min(currentMs, Math.max(durationMs, 0));
  const progress = value / max;

  return (
    <div className="relative h-9">
      <div
        className="pointer-events-none flex h-full items-end gap-px"
        data-testid="preview-waveform"
        aria-hidden="true"
      >
        {waveform.map((height, index) => (
          <span
            key={index}
            className={cn(
              'min-w-0 flex-1',
              index / WAVE_BARS <= progress ? 'bg-white' : 'bg-white/30',
            )}
            style={{
              height: `${height * 100}%`,
              borderRadius: barBorderRadius,
            }}
          />
        ))}
      </div>
      <input
        type="range"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        min={0}
        max={max}
        step={1}
        value={value}
        aria-label={label}
        onChange={event => onSeek(Number(event.target.value))}
      />
    </div>
  );
}

function TransportButton({
  label,
  onClick,
  primary = false,
  disabled = false,
  className,
  style,
  children,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={cn(
        'grid place-items-center rounded-button transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-40',
        primary
          ? cn('size-10', className)
          : cn(
              'size-9 border border-white/25 bg-black/35 text-white backdrop-blur-md hover:bg-white/20',
              className,
            ),
      )}
    >
      {children}
    </button>
  );
}

function isCrossOriginUrl(url: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URL(url, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
