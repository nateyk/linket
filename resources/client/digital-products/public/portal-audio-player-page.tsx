import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Spinner} from '@shadcn/spinner/spinner';
import {apiClient} from '@common/http/query-client';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {
  ArrowLeftIcon,
  DownloadIcon,
  HeadphonesIcon,
  MailIcon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {Link, useParams} from 'react-router';
import {MyPortalShell} from './my-portal-shell';
import {
  downloadPackFile,
  requestPackDownloadUrl,
  resendPackReceipt,
} from './portal-pack-actions';
import {
  demoPackOrder,
  findPackOrder,
  isStreamableAudioName,
  remainingDownloads,
  type PackDetailDownload,
  type PackDetailOrder,
} from './portal-pack-order';

export function Component() {
  const {orderId} = useParams<{orderId: string}>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [order, setOrder] = useState<PackDetailOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Purchase not found.');
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    setOrder(null);

    apiClient
      .get('/api/v1/public/my-portal/library', {signal: controller.signal})
      .then(response => {
        const payload = response.data;
        const orders = (payload?.orders ??
          payload?.data?.orders ??
          []) as PackDetailOrder[];
        const found =
          findPackOrder(orders, orderId, 'audio') ??
          demoPackOrder(orderId, 'audio');
        if (!found) {
          setError('This audio pack is not available in your library.');
          return;
        }
        setOrder(found);
      })
      .catch(reason => {
        if (reason instanceof DOMException && reason.name === 'AbortError') {
          return;
        }
        const demo = demoPackOrder(orderId, 'audio');
        if (demo) {
          setOrder(demo);
          return;
        }
        setError('Unable to load this audio pack.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [orderId]);

  const tracks = order?.downloads.filter(d => d.available) ?? [];
  const track = tracks[current] as PackDetailDownload | undefined;
  const streamable = isStreamableAudioName(track?.name);

  useEffect(() => {
    setStreamUrl(null);
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
  }, [current, order?.id]);

  const ensureStream = async (): Promise<string | null> => {
    if (!order || !track) {
      return null;
    }
    if (streamUrl) {
      return streamUrl;
    }
    setBusy(`stream-${track.id}`);
    try {
      const url = await requestPackDownloadUrl(order, track);
      if (url) {
        setStreamUrl(url);
      }
      return url;
    } finally {
      setBusy(undefined);
    }
  };

  const playPause = async () => {
    if (!order || !track) {
      return;
    }
    if (!streamable || order.is_demo) {
      setBusy(`download-${track.id}`);
      try {
        await downloadPackFile(order, track);
      } finally {
        setBusy(undefined);
      }
      return;
    }
    const url = await ensureStream();
    if (!url || !audioRef.current) {
      return;
    }
    if (audioRef.current.src !== url) {
      audioRef.current.src = url;
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    try {
      await audioRef.current.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setBusy(`download-${track.id}`);
      try {
        await downloadPackFile(order, track);
      } finally {
        setBusy(undefined);
      }
    }
  };

  const selectTrack = (index: number) => {
    if (index === current) {
      void playPause();
      return;
    }
    setCurrent(index);
  };

  const onDownload = async (download: PackDetailDownload) => {
    if (!order) {
      return;
    }
    setBusy(`download-${download.id}`);
    try {
      await downloadPackFile(order, download);
    } finally {
      setBusy(undefined);
    }
  };

  const onResend = async () => {
    if (!order) {
      return;
    }
    setBusy(`receipt-${order.id}`);
    try {
      await resendPackReceipt(order);
    } finally {
      setBusy(undefined);
    }
  };

  if (loading) {
    return (
      <MyPortalShell wide>
        <div className="flex min-h-64 items-center justify-center">
          <Spinner />
        </div>
      </MyPortalShell>
    );
  }

  if (error || !order) {
    return (
      <MyPortalShell wide>
        <Alert.Root variant="warning" fillStyle="subtleFill">
          <Alert.Title>
            <Trans message="Audio pack unavailable" />
          </Alert.Title>
          <Alert.Description>
            {error ?? <Trans message="Purchase not found." />}
          </Alert.Description>
        </Alert.Root>
        <Button
          className="mt-4 w-fit"
          render={<Link to="/my-portal?section=audio" />}
        >
          <Trans message="Back to audio library" />
        </Button>
      </MyPortalShell>
    );
  }

  const remaining = remainingDownloads(order);

  return (
    <MyPortalShell wide>
      <audio
        ref={audioRef}
        className="hidden"
        onEnded={() => {
          if (current < tracks.length - 1) {
            setCurrent(c => c + 1);
            setPlaying(false);
          } else {
            setPlaying(false);
          }
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <Link
            to="/my-portal?section=audio"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            <Trans message="Audio library" />
          </Link>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Trans message="Beat pack" />
            </p>
            <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              {order.product_title || <Trans message="Audio pack" />}
            </h1>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            <section
              aria-label="Player"
              className="overflow-hidden rounded-card border border-border bg-card"
            >
              <div className="relative aspect-video bg-secondary">
                {order.product_cover ? (
                  <img
                    src={order.product_cover}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <HeadphonesIcon className="size-10" aria-hidden="true" />
                  </div>
                )}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/10 to-transparent"
                  aria-hidden="true"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-background">
                  <div className="min-w-0">
                    <p className="text-xs font-medium tracking-wide uppercase opacity-80">
                      <Trans
                        message="Track :current of :total"
                        values={{
                          current: tracks.length ? current + 1 : 0,
                          total: tracks.length,
                        }}
                      />
                    </p>
                    <p className="truncate text-2xl font-semibold tracking-tight">
                      {track?.name ?? <Trans message="No tracks" />}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Previous track"
                  disabled={current === 0 || !tracks.length}
                  onClick={() => current > 0 && selectTrack(current - 1)}
                >
                  <SkipBackIcon />
                </Button>
                <Button
                  size="icon"
                  className="size-12 rounded-full"
                  disabled={!track || !!busy}
                  aria-label={
                    !streamable || order.is_demo
                      ? `Download ${track?.name ?? 'track'}`
                      : playing
                        ? 'Pause'
                        : 'Play'
                  }
                  onClick={() => void playPause()}
                >
                  {busy ? (
                    <Spinner />
                  ) : !streamable || order.is_demo ? (
                    <DownloadIcon />
                  ) : playing ? (
                    <PauseIcon />
                  ) : (
                    <PlayIcon className="ml-0.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Next track"
                  disabled={current >= tracks.length - 1 || !tracks.length}
                  onClick={() =>
                    current < tracks.length - 1 && selectTrack(current + 1)
                  }
                >
                  <SkipForwardIcon />
                </Button>
              </div>
            </section>

            <section
              aria-labelledby="tracks-heading"
              className="overflow-hidden rounded-card border border-border bg-card"
            >
              <div className="border-b border-border p-4">
                <h2 id="tracks-heading" className="font-semibold">
                  <Trans message="Tracks" />
                </h2>
              </div>
              {tracks.length ? (
                <ol className="divide-y divide-border">
                  {tracks.map((t, i) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => selectTrack(i)}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-button bg-secondary text-xs tabular-nums text-muted-foreground">
                          {i === current && playing ? (
                            <PauseIcon className="size-3.5 text-primary" />
                          ) : (
                            i + 1
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {t.name ?? <Trans message="Track" />}
                        </span>
                      </button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={
                          !!order.is_demo || busy === `download-${t.id}`
                        }
                        aria-label={`Download ${t.name ?? 'track'}`}
                        onClick={() => void onDownload(t)}
                      >
                        {busy === `download-${t.id}` ? (
                          <Spinner />
                        ) : (
                          <DownloadIcon />
                        )}
                      </Button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="px-4 py-5 text-sm text-muted-foreground">
                  <Trans message="No tracks are available for this purchase right now." />
                </p>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-4">
            <Card.Root className="gap-0 py-0 shadow-none">
              <Card.Header className="border-b py-4">
                <Card.Title className="text-base">
                  <Trans message="Access" />
                </Card.Title>
              </Card.Header>
              <Card.Content className="flex flex-col gap-3 py-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    <Trans message="Downloads left" />
                  </span>
                  <span className="tabular-nums font-medium">{remaining}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    <Trans message="Purchased" />
                  </span>
                  <span>
                    {order.paid_at ? (
                      <FormattedDate date={order.paid_at} />
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">
                    <Trans message="Order" />
                  </span>
                  <span className="truncate font-mono text-xs">{order.id}</span>
                </div>
              </Card.Content>
            </Card.Root>
            <Button
              variant="outline"
              disabled={!!order.is_demo || busy === `receipt-${order.id}`}
              onClick={() => void onResend()}
            >
              {busy === `receipt-${order.id}` ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <MailIcon data-icon="inline-start" />
              )}
              <Trans message="Resend receipt" />
            </Button>
          </aside>
        </div>
      </div>
    </MyPortalShell>
  );
}
