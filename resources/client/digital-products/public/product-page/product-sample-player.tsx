import {ProductCover} from '@ui/product-cover';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {
  HeadphonesIcon,
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
  type ReactNode,
} from 'react';
import type {
  PublicDigitalProduct,
  PublicProductSample,
} from '../digital-product-public-pages';

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

  return (
    <SamplePlayerContext.Provider value={player}>
      {children}
      {current && (
        <audio
          ref={player.audioRef}
          src={current.url}
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

export function ProductSampleStage({product}: {product: PublicDigitalProduct}) {
  const player = usePlayer();
  const samples = player.samples;
  const current = samples[player.index];
  if (!current) return null;

  return (
    <div className="relative overflow-hidden bg-[var(--biolink-surface)]">
      <div className="relative aspect-[5/4] sm:aspect-video">
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white">
            <Music2Icon className="size-3" aria-hidden="true" />
            <Trans message="Free preview" />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white tabular-nums">
            <HeadphonesIcon className="size-3" aria-hidden="true" />
            {player.index + 1}/{samples.length}
          </span>
        </div>
        <button
          type="button"
          className="absolute top-[30%] left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-black shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:top-[36%] sm:size-16"
          onClick={player.toggle}
          aria-label={
            player.playing
              ? player.trans(message('Pause preview'))
              : player.trans(message('Play preview'))
          }
        >
          {player.playing ? (
            <PauseIcon className="size-6" aria-hidden="true" />
          ) : (
            <PlayIcon className="ms-0.5 size-6" aria-hidden="true" />
          )}
        </button>
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-white/70 uppercase">
                <Trans message="Now previewing" />
              </p>
              <p className="truncate text-lg font-semibold tracking-tight text-white">
                {trackTitle(current)}
              </p>
            </div>
            {player.playing ? <Equalizer /> : null}
          </div>
          <PreviewScrubber
            currentMs={player.currentMs}
            durationMs={player.durationMs}
            label={player.trans(message('Preview progress'))}
            onSeek={player.seek}
          />
          <div className="mt-1.5 flex items-center justify-between text-xs text-white/80 tabular-nums">
            <span>{formatClock(player.currentMs)}</span>
            <span>{formatClock(player.durationMs)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-[var(--biolink-border)] px-4 py-3">
        <TransportButton
          label={player.trans(message('Previous preview'))}
          disabled={player.index === 0}
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
          onClick={player.toggle}
        >
          {player.playing ? (
            <PauseIcon className="size-5" aria-hidden="true" />
          ) : (
            <PlayIcon className="ms-0.5 size-5" aria-hidden="true" />
          )}
        </TransportButton>
        <TransportButton
          label={player.trans(message('Next preview'))}
          disabled={player.index === samples.length - 1}
          onClick={() => player.go(player.index + 1, true)}
        >
          <SkipForwardIcon className="size-4" aria-hidden="true" />
        </TransportButton>
      </div>
    </div>
  );
}

export function ProductSampleTracklist() {
  const player = usePlayer();

  return (
    <div className="flex flex-col border-t border-[var(--biolink-border)]">
      <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-2 sm:px-7">
        <h2 className="text-sm font-semibold tracking-tight">
          <Trans message="Tracklist" />
        </h2>
        <p className="text-xs text-[var(--biolink-muted-text)]">
          <Trans
            message=":count free previews"
            values={{count: player.samples.length}}
          />
        </p>
      </div>
      <ul className="flex flex-col border-t border-[var(--biolink-border)]">
        {player.samples.map((sample, index) => {
          const active = index === player.index;
          return (
            <li key={sample.id} className="border-b border-[var(--biolink-border)] last:border-b-0">
              <button
                type="button"
                className={cn(
                  'flex min-h-12 w-full items-center gap-3 px-5 py-2.5 text-start focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--biolink-text)] focus-visible:outline-none sm:px-7',
                  active
                    ? 'bg-[var(--biolink-surface)]'
                    : 'hover:bg-[var(--biolink-surface)]',
                )}
                aria-current={active ? 'true' : undefined}
                onClick={() => player.go(index, true)}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--biolink-surface-strong)] text-[var(--biolink-text)] ring-1 ring-(color:--biolink-border)">
                  {active && player.playing ? (
                    <PauseIcon className="size-3.5" aria-hidden="true" />
                  ) : (
                    <PlayIcon className="ms-px size-3.5" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-sm',
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
      <p className="border-t border-[var(--biolink-border)] px-5 py-3 text-sm text-[var(--biolink-muted-text)] sm:px-7">
        <Trans message="Full pack unlocked after purchase" />
      </p>
    </div>
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingPlay = useRef(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(samples[0]?.duration_ms ?? 0);

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

function PreviewScrubber({
  currentMs,
  durationMs,
  label,
  onSeek,
}: {
  currentMs: number;
  durationMs: number;
  label: string;
  onSeek: (ms: number) => void;
}) {
  const max = Math.max(durationMs, 1);
  const value = Math.min(currentMs, Math.max(durationMs, 0));
  const progress = value / max;

  return (
    <div className="relative h-9">
      <div className="pointer-events-none flex h-full items-end gap-px" aria-hidden="true">
        {waveform.map((height, index) => (
          <span
            key={index}
            className={cn(
              'min-w-0 flex-1 rounded-full',
              index / WAVE_BARS <= progress ? 'bg-white' : 'bg-white/30',
            )}
            style={{height: `${height * 100}%`}}
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

function Equalizer() {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
      {[0.6, 1, 0.4].map((height, index) => (
        <span
          key={index}
          className="w-0.5 animate-pulse rounded-full bg-white"
          style={{
            height: `${height * 100}%`,
            animationDelay: `${index * 150}ms`,
          }}
        />
      ))}
    </span>
  );
}

function TransportButton({
  label,
  onClick,
  primary = false,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-[var(--biolink-text)] focus-visible:outline-none disabled:opacity-40',
        primary
          ? 'size-12 bg-[var(--biolink-text)] text-[var(--biolink-surface-strong)]'
          : 'size-11 bg-[var(--biolink-surface-strong)] text-[var(--biolink-text)] ring-1 ring-(color:--biolink-border)',
      )}
    >
      {children}
    </button>
  );
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
