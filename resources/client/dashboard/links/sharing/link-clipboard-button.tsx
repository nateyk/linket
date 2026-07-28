import {FormattedUrl} from '@app/dashboard/links/utils/formatted-url';
import {Button} from '@ui/buttons/button';
import {ButtonBase} from '@ui/buttons/button-base';
import {IconButton} from '@ui/buttons/icon-button';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {Tooltip} from '@ui/tooltip/tooltip';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {ComponentProps} from 'react';
import {CopyLinkIcon} from './copy-link-icon';

interface LinkClipboardButtonProps extends Omit<
  ComponentProps<typeof Button>,
  'variant'
> {
  url: string;
  variant: 'icon' | 'text';
}
export function LinkClipboardButton({
  url,
  variant,
  ...domProps
}: LinkClipboardButtonProps) {
  const [, setCopied] = useClipboard(url);

  if (variant === 'text') {
    return (
      <ButtonBase
        {...domProps}
        onClick={() => {
          setCopied();
          toast.positive(message('Copied to clipboard'));
        }}
      >
        <FormattedUrl url={url} />
      </ButtonBase>
    );
  }

  return (
    <Tooltip label={<Trans message="Copy to clipboard" />}>
      <IconButton
        {...domProps}
        onClick={() => {
          setCopied();
          toast.positive(message('Copied to clipboard'));
        }}
      >
        <CopyLinkIcon />
      </IconButton>
    </Tooltip>
  );
}
