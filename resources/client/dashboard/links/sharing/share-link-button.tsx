import {ShareLinkDialog} from '@app/dashboard/links/sharing/share-link-dialog';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {Share2Icon} from 'lucide-react';
import {ComponentProps, useState} from 'react';

export type ShareLinkButtonProps = {
  url: string;
  qrUrl?: string | null;
  longUrl?: string;
  type?: 'icon' | 'text';
  variant?: ComponentProps<typeof Button>['variant'];
  className?: string;
  color?: ComponentProps<typeof Button>['color'];
};

export function ShareLinkButton({
  url,
  qrUrl,
  longUrl,
  className,
  type = 'icon',
  variant = 'ghost',
  color = 'default',
}: ShareLinkButtonProps) {
  const [open, setOpen] = useState(false);

  const dialogTrigger =
    type === 'text' ? (
      <Dialog.Trigger
        render={
          <Button className={className} variant={variant} color={color} />
        }
      >
        <Share2Icon data-icon="inline-start" />
        <Trans message="Share" />
      </Dialog.Trigger>
    ) : (
      <Tooltip.Root>
        <Dialog.Trigger
          render={
            <Tooltip.Trigger
              render={
                <Button
                  className={className}
                  variant={variant}
                  color={color}
                  size="icon-sm"
                />
              }
            />
          }
        >
          <Share2Icon />
        </Dialog.Trigger>
        <Tooltip.Content>
          <Trans message="Share" />
        </Tooltip.Content>
      </Tooltip.Root>
    );

  return (
    <ShareLinkDialog
      open={open}
      onOpenChange={setOpen}
      url={url}
      qrUrl={qrUrl}
      longUrl={longUrl}
    >
      {dialogTrigger}
    </ShareLinkDialog>
  );
}
