import {retrieveOutgoingEmailLogItemOptions} from '@common/admin/logging/outgoing-email/outgoing-email-queries';
import {buttonVariants} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Spinner} from '@shadcn/spinner/spinner';
import {useQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import {ReactElement} from 'react';

interface Props {
  children: ReactElement<typeof Dialog.Trigger>;
  logItemId: number;
}

export function OutgoingEmailLogEntryDialog({children, logItemId}: Props) {
  return (
    <Dialog.Root>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent logItemId={logItemId} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({logItemId}: {logItemId: number}) {
  const {data} = useQuery(retrieveOutgoingEmailLogItemOptions(logItemId));
  const {base_url} = useSettings();

  return (
    <Dialog.Content className="h-full sm:max-w-full">
      <Dialog.Header className="flex-row items-center pe-12">
        <Dialog.Title className="flex-1">
          <Trans message="Email preview" />
        </Dialog.Title>
        <a
          href={`${base_url}/api/v1/logs/outgoing-email/${logItemId}/download`}
          download
          className={cn(
            buttonVariants({
              variant: 'outline',
              color: 'default',
              size: 'sm',
            }),
          )}
        >
          <Trans message="Download" />
        </a>
      </Dialog.Header>
      <Dialog.Body className="flex items-center justify-center">
        {data?.data?.parsed_message?.body.html ? (
          <iframe
            srcDoc={data.data.parsed_message.body.html}
            className="size-full border-none"
            onLoad={e => {
              const iframe = e.target as HTMLIFrameElement;
              iframe.style.height =
                iframe.contentWindow!.document.body.scrollHeight + 'px';
            }}
          />
        ) : (
          <Spinner className="size-6" />
        )}
      </Dialog.Body>
    </Dialog.Content>
  );
}
