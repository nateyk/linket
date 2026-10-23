import {Button} from '@shadcn/button/button';
import {Spinner} from '@shadcn/spinner/spinner';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {
  DownloadIcon,
  FileArchiveIcon,
  FileTextIcon,
  HeadphonesIcon,
  PackageOpenIcon,
} from 'lucide-react';
import {Link} from 'react-router';

export type PackDownload = {
  id: number;
  name: string | null;
  remaining_downloads: number;
  expires_at: string | null;
  available: boolean;
};

export type PackOrder = {
  id: string;
  product_title: string | null;
  product_cover?: string | null;
  product_type?: string | null;
  paid_at: string | null;
  downloads: PackDownload[];
  is_demo?: boolean;
};

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

export function PortalEntitlementPack({
  order,
  busy,
  variant = 'files',
  onDownload,
}: {
  order: PackOrder;
  busy?: string;
  variant?: 'files' | 'audio';
  onDownload: (order: PackOrder, download: PackDownload) => Promise<void>;
}) {
  const downloads = order.downloads.filter(d => d.available);
  const CoverIcon = variant === 'audio' ? HeadphonesIcon : PackageOpenIcon;

  return (
    <article className="overflow-hidden rounded-card border border-border bg-card">
      <div className="flex items-center gap-4 border-b border-border p-4">
        <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-button bg-muted">
          {order.product_cover ? (
            <img
              src={order.product_cover}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <CoverIcon className="size-6" aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">
            {order.product_title || <Trans message="Digital product" />}
          </h3>
          <p className="text-sm text-muted-foreground">
            {order.is_demo ? (
              <Trans message="Sample pack" />
            ) : order.paid_at ? (
              <Trans
                message="Purchased :date"
                values={{date: <FormattedDate date={order.paid_at} />}}
              />
            ) : (
              <Trans message="Paid purchase" />
            )}
            {' · '}
            <Trans
              message=":count files"
              values={{count: downloads.length}}
            />
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          render={
            <Link
              to={
                variant === 'audio'
                  ? `/my-portal/audio/${order.id}`
                  : `/my-portal/downloads/${order.id}`
              }
            />
          }
        >
          <Trans message="Open" />
        </Button>
      </div>
      {downloads.length ? (
        <ul className="divide-y divide-border">
          {downloads.map(download => {
            const Icon = fileIcon(download.name);
            return (
              <li
                key={download.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-button bg-secondary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {download.name ?? <Trans message="Download file" />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <Trans
                      message=":count left"
                      values={{count: download.remaining_downloads}}
                    />
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={
                    !!order.is_demo || busy === `download-${download.id}`
                  }
                  aria-label={`Download ${download.name ?? 'file'}`}
                  onClick={() => void onDownload(order, download)}
                >
                  {busy === `download-${download.id}` ? (
                    <Spinner />
                  ) : (
                    <DownloadIcon />
                  )}
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
    </article>
  );
}
