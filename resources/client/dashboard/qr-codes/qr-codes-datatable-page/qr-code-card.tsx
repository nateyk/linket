import {sharedDashboardIcons} from '@app/dashboard/layout/sidenav/dashboard-sidebar-icons';
import {FormattedUrl} from '@app/dashboard/links/utils/formatted-url';
import {LinkeableName} from '@app/dashboard/links/utils/linkeable-name';
import {buildQrCodeUrl} from '@app/dashboard/qr-codes/build-qr-code-url';
import {
  downloadQrCode,
  QrCodeRenderer,
} from '@app/dashboard/qr-codes/qr-code-renderer';
import {QrCode} from '@app/gen/schemas/qr-code';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Item} from '@shadcn/item/item';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {ignoreEventsFromPortal} from '@ui/utils/dom/ignore-events-from-portal';
import clsx from 'clsx';
import {CornerDownRightIcon, DownloadIcon, ScanQrCodeIcon} from 'lucide-react';
import {ReactElement, ReactNode, use, useState} from 'react';
import {Link, useNavigate} from 'react-router';
import {QrCodeActionsButton} from './qr-code-actions-button';

type QrCodeCardProps = {
  qrCode: QrCode;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
};
export function QrCodeCard({
  qrCode,
  isSelected,
  onToggle,
  onDelete,
}: QrCodeCardProps) {
  const navigate = useNavigate();
  const {isMobileMode} = use(DashboardLayoutContext);

  return (
    <Item.Root
      variant="outline"
      className="transition-shadow hover:shadow-sm"
      onClick={ignoreEventsFromPortal(e => {
        if (!(e.target as HTMLElement).closest('a, button, input')) {
          navigate(`${qrCode.id}`);
        }
      })}
    >
      <QrCodePreview
        qrCode={qrCode}
        isSelected={isSelected}
        onToggle={onToggle}
      />
      <Item.Content className="gap-0">
        <LinkeableTypeBadge modelType={qrCode.linkeable?.model_type ?? null} />
        <Item.Title className="text-base font-semibold">
          <Link className="hover:underline" to={`${qrCode.id}`}>
            <LinkeableName linkeable={qrCode} />
          </Link>
        </Item.Title>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <CornerDownRightIcon className="size-3 shrink-0" />
          {qrCode.long_url ? (
            <a
              href={qrCode.long_url}
              target="_blank"
              rel="noreferrer"
              className="truncate hover:underline"
            >
              <FormattedUrl url={qrCode.long_url} />
            </a>
          ) : null}
          {!isMobileMode ? (
            <>
              <div className="shrink-0">&bull;</div>
              <FormattedRelativeTime date={qrCode.updated_at} style="narrow" />
            </>
          ) : null}
        </div>
      </Item.Content>
      <Item.Actions className="gap-1 md:ml-0">
        {!isMobileMode && (
          <Button variant="outline" size="sm" className="mr-4">
            <ScanQrCodeIcon />
            <Trans
              message=":count scans"
              values={{
                count: <FormattedNumber value={qrCode.scans_count ?? 0} />,
              }}
            />
          </Button>
        )}
        {!isMobileMode ? <QrCodeDownloadButton qrCode={qrCode} /> : null}
        <QrCodeActionsButton
          qrCode={qrCode}
          variant="ghost"
          size="icon-sm"
          onDelete={onDelete}
        />
      </Item.Actions>
    </Item.Root>
  );
}

type QrCodePreviewProps = {
  qrCode: QrCode;
  isSelected: boolean;
  onToggle: () => void;
};
function QrCodePreview({qrCode, isSelected, onToggle}: QrCodePreviewProps) {
  const {isMobileMode} = use(DashboardLayoutContext);
  const [isHovered, setIsHovered] = useState(false);
  const isCheckboxVisible = isSelected || (!isMobileMode && isHovered);

  return (
    <Item.Media
      align="center"
      className={cn(
        'user-select-none size-20.5 rounded-card-sm border p-1.5',
        isMobileMode && 'pointer-events-none',
      )}
      onMouseEnter={isMobileMode ? undefined : () => setIsHovered(true)}
      onMouseLeave={isMobileMode ? undefined : () => setIsHovered(false)}
      onClick={e => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <QrCodeRenderer
        url={buildQrCodeUrl(qrCode)}
        style={qrCode.style}
        size={68}
        className={clsx(isCheckboxVisible ? 'hidden' : 'block')}
      />
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle()}
        className={clsx(isCheckboxVisible ? 'block' : 'hidden')}
      />
    </Item.Media>
  );
}

const qrDownloadTypes = ['png', 'svg', 'jpeg', 'webp'] as const;
type QrCodeDownloadButtonProps = {
  qrCode: QrCode;
};
function QrCodeDownloadButton({qrCode}: QrCodeDownloadButtonProps) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger render={<Button variant="ghost" size="icon-sm" />}>
        <DownloadIcon />
      </Dropdown.Trigger>
      <Dropdown.Content>
        {qrDownloadTypes.map(extension => (
          <Dropdown.Item
            key={extension}
            onClick={() =>
              downloadQrCode({
                qrCode,
                extension,
              })
            }
          >
            <Trans
              message=":format"
              values={{format: extension.toUpperCase()}}
            />
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown.Root>
  );
}

type LinkeableTypeBadgeProps = {
  modelType: 'link' | 'folder' | 'biolink' | string | null;
};
function LinkeableTypeBadge({modelType}: LinkeableTypeBadgeProps) {
  let icon: ReactElement | null = null;
  let label: ReactNode | null = null;

  if (modelType === 'link') {
    icon = sharedDashboardIcons.links;
    label = <Trans message="Short link" />;
  } else if (modelType === 'folder') {
    icon = sharedDashboardIcons.folders;
    label = <Trans message="Folder" />;
  } else if (modelType === 'biolink') {
    icon = sharedDashboardIcons.biolinks;
    label = <Trans message="Link in bio" />;
  } else {
    icon = sharedDashboardIcons['qr-codes'];
    label = <Trans message="QR code" />;
  }

  return (
    <Badge variant="secondary" className="mb-2">
      {icon}
      {label}
    </Badge>
  );
}
