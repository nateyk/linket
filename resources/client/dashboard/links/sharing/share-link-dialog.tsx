import {LinkImage} from '@app/dashboard/links/link-image';
import {
  SiFacebook,
  SiInstagram,
  SiMessenger,
  SiTelegram,
  SiTiktok,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from '@icons-pack/react-simple-icons';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {toast} from '@shadcn/toast/toast';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {LinkedinIcon} from '@ui/icons/social/linkedin';
import {cn} from '@ui/utils/cn';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {
  CopyIcon,
  ExternalLinkIcon,
  MailIcon,
  QrCodeIcon,
  Share2Icon,
} from 'lucide-react';
import {ReactElement, ReactNode} from 'react';

type SharePlatform =
  | 'whatsapp'
  | 'facebook'
  | 'instagram'
  | 'x'
  | 'email'
  | 'tiktok'
  | 'linkedin'
  | 'youtube'
  | 'telegram'
  | 'messenger';

type PlatformButtonConfig = {
  id: SharePlatform;
  label: string;
  icon: ReactNode;
};

const platformButtons: PlatformButtonConfig[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: <SiWhatsapp className="text-[#25D366]" />,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: <SiFacebook className="text-[#1877F2]" />,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: <SiInstagram className="text-[#E4405F]" />,
  },
  {
    id: 'x',
    label: 'X',
    icon: <SiX className="text-default" />,
  },
  {
    id: 'email',
    label: 'Email',
    icon: <MailIcon className="text-default" />,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: <SiTiktok className="text-[#000000]" />,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: <LinkedinIcon className="text-[#0A66C2]" />,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: <SiYoutube className="text-[#FF0000]" />,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: <SiTelegram className="text-[#26A5E4]" />,
  },
  {
    id: 'messenger',
    label: 'Messenger',
    icon: <SiMessenger className="text-[#0084FF]" />,
  },
];

type ShareLinkDialogProps = {
  url: string;
  qrUrl?: string | null;
  longUrl?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactElement<typeof Dialog.Trigger>;
};

export function ShareLinkDialog({
  url,
  qrUrl,
  longUrl,
  open,
  onOpenChange,
  children,
}: ShareLinkDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent url={url} qrUrl={qrUrl} longUrl={longUrl} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  url,
  qrUrl,
  longUrl,
}: Pick<ShareLinkDialogProps, 'url' | 'qrUrl' | 'longUrl'>) {
  return (
    <Dialog.Content className="sm:max-w-140">
      <Dialog.Header>
        <Dialog.Title>
          <Share2Icon />
          <Trans message="Share link" />
        </Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>
        <ShareInput url={url} qrUrl={qrUrl} longUrl={longUrl} />
        <div className="mx-auto grid w-max max-w-md grid-cols-5 gap-5">
          {platformButtons.map(platform => (
            <PlatformButton key={platform.id} config={platform} link={url} />
          ))}
        </div>
      </Dialog.Body>
    </Dialog.Content>
  );
}

function ShareInput({
  url,
  qrUrl,
  longUrl,
}: Pick<ShareLinkDialogProps, 'url' | 'qrUrl' | 'longUrl'>) {
  const [, setUrlCopied] = useClipboard(url);
  const [, setQrCopied] = useClipboard(qrUrl ?? '');
  return (
    <div className="mx-auto mb-8.5 flex items-center rounded-full bg-primary/10 p-4">
      <div className="flex min-w-0 flex-auto items-center gap-2.5">
        {longUrl ? (
          <LinkImage
            link={{
              long_url: longUrl,
            }}
            size="size-6"
            className="rounded-full"
          />
        ) : null}
        <div className="min-w-0 truncate text-base font-semibold">
          {removeProtocol(url)}
        </div>
      </div>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:bg-primary/10"
              onClick={() => {
                setUrlCopied();
                toast.success(<Trans message="Copied link to clipboard" />);
              }}
            >
              <CopyIcon />
            </Button>
          }
        />
        <Tooltip.Content>
          <Trans message="Copy link" />
        </Tooltip.Content>
      </Tooltip.Root>
      {qrUrl ? (
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="hover:bg-primary/10"
                onClick={() => {
                  setQrCopied();
                  toast.success(
                    <Trans message="Copied QR code link to clipboard" />,
                  );
                }}
              >
                <QrCodeIcon />
              </Button>
            }
          />
          <Tooltip.Content>
            <Trans message="Copy QR code" />
          </Tooltip.Content>
        </Tooltip.Root>
      ) : null}
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="hover:bg-primary/10"
              onClick={() => {
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLinkIcon />
            </Button>
          }
        />
        <Tooltip.Content>
          <Trans message="Open link" />
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  );
}

type PlatformButtonProps = {
  config: PlatformButtonConfig;
  link: string;
};

function PlatformButton({config, link}: PlatformButtonProps) {
  return (
    <button
      className={cn('group h-auto flex-col gap-2 py-0 text-muted-foreground')}
      onClick={() => {
        const shareUrl = buildShareUrl(config.id, link);
        window.open(shareUrl, '_blank', 'noopener,noreferrer');
      }}
    >
      <span className="flex size-15 items-center justify-center rounded-input border border-border bg-background transition-colors group-hover:border-primary/40">
        {config.icon}
      </span>
      <span className="text-xs group-hover:text-primary">
        <Trans message={config.label} />
      </span>
    </button>
  );
}

function buildShareUrl(platform: SharePlatform, link: string): string {
  const encodedLink = encodeURIComponent(link);
  const encodedText = encodeURIComponent('Check out this link');
  const encodedBody = encodeURIComponent(`Check out this link: ${link}`);

  switch (platform) {
    case 'whatsapp':
      return `https://wa.me/?text=${encodedText}%20${encodedLink}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`;
    case 'x':
      return `https://x.com/intent/post?text=${encodedText}&url=${encodedLink}`;
    case 'email':
      return `mailto:?subject=${encodedText}&body=${encodedBody}`;
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodedLink}&text=${encodedText}`;
    case 'messenger':
      return `https://www.messenger.com/new?text=${encodedBody}`;
    case 'instagram':
      return `https://www.instagram.com/direct/new/`;
    case 'tiktok':
      return `https://www.tiktok.com`;
    case 'youtube':
      return `https://www.youtube.com`;
  }
}
