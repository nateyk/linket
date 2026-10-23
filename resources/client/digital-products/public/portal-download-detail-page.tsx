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
  FileArchiveIcon,
  FileTextIcon,
  HeadphonesIcon,
  MailIcon,
  PackageOpenIcon,
} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link, useParams} from 'react-router';
import {MyPortalShell} from './my-portal-shell';
import {downloadPackFile, resendPackReceipt} from './portal-pack-actions';
import {
  demoPackOrder,
  findPackOrder,
  remainingDownloads,
  type PackDetailDownload,
  type PackDetailOrder,
} from './portal-pack-order';

function fileIcon(name: string | null) {
  const lower = (name ?? '').toLowerCase();
  if (/\.(zip|rar|7z)$/.test(lower)) {
    return FileArchiveIcon;
  }
  if (/\.(mp3|wav|flac|aac|m4a)$/.test(lower)) {
    return HeadphonesIcon;
  }
  return FileTextIcon;
}

export function Component() {
  const {orderId} = useParams<{orderId: string}>();
  const [order, setOrder] = useState<PackDetailOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();

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
          findPackOrder(orders, orderId, 'download') ??
          demoPackOrder(orderId, 'download');
        if (!found) {
          setError('This download is not available in your library.');
          return;
        }
        setOrder(found);
      })
      .catch(reason => {
        if (reason instanceof DOMException && reason.name === 'AbortError') {
          return;
        }
        const demo = demoPackOrder(orderId, 'download');
        if (demo) {
          setOrder(demo);
          return;
        }
        setError('Unable to load this download.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [orderId]);

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

  const onDownloadAll = async () => {
    if (!order) {
      return;
    }
    const available = order.downloads.filter(d => d.available);
    setBusy('download-all');
    try {
      for (const download of available) {
        await downloadPackFile(order, download);
      }
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
            <Trans message="Download unavailable" />
          </Alert.Title>
          <Alert.Description>
            {error ?? <Trans message="Purchase not found." />}
          </Alert.Description>
        </Alert.Root>
        <Button
          className="mt-4 w-fit"
          render={<Link to="/my-portal?section=downloads" />}
        >
          <Trans message="Back to downloads" />
        </Button>
      </MyPortalShell>
    );
  }

  const files = order.downloads.filter(d => d.available);
  const remaining = remainingDownloads(order);

  return (
    <MyPortalShell wide>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <Link
            to="/my-portal?section=downloads"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            <Trans message="Downloads" />
          </Link>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <Trans message="Digital assets" />
            </p>
            <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              {order.product_title || <Trans message="Digital product" />}
            </h1>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="relative aspect-video overflow-hidden rounded-card border border-border bg-secondary">
              {order.product_cover ? (
                <img
                  src={order.product_cover}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <PackageOpenIcon className="size-10" aria-hidden="true" />
                </div>
              )}
            </div>

            <section
              aria-labelledby="files-heading"
              className="overflow-hidden rounded-card border border-border bg-card"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border p-4">
                <div>
                  <h2 id="files-heading" className="font-semibold">
                    <Trans message="Your files" />
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    <Trans
                      message=":count files"
                      values={{count: files.length}}
                    />
                  </p>
                </div>
                {files.length > 1 ? (
                  <Button
                    size="sm"
                    disabled={!!order.is_demo || busy === 'download-all'}
                    onClick={() => void onDownloadAll()}
                  >
                    {busy === 'download-all' ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <DownloadIcon data-icon="inline-start" />
                    )}
                    <Trans message="Download all" />
                  </Button>
                ) : null}
              </div>
              {files.length ? (
                <ul className="divide-y divide-border">
                  {files.map(download => {
                    const Icon = fileIcon(download.name);
                    return (
                      <li
                        key={download.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-button bg-secondary">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {download.name ?? (
                              <Trans message="Download file" />
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Trans
                              message=":count left"
                              values={{
                                count: download.remaining_downloads,
                              }}
                            />
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            !!order.is_demo ||
                            busy === `download-${download.id}`
                          }
                          aria-label={`Download ${download.name ?? 'file'}`}
                          onClick={() => void onDownload(download)}
                        >
                          {busy === `download-${download.id}` ? (
                            <Spinner data-icon="inline-start" />
                          ) : (
                            <DownloadIcon data-icon="inline-start" />
                          )}
                          <Trans message="Download" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-4 py-5 text-sm text-muted-foreground">
                  <Trans message="No downloadable files are available for this purchase right now." />
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
