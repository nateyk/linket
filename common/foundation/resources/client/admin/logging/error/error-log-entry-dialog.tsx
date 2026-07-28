import {ErrorLogItem} from '@app/gen/schemas/error-log-item';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Trans} from '@ui/i18n/trans';
import {ReactElement} from 'react';

interface Props {
  children: ReactElement<typeof Dialog.Trigger>;
  error: ErrorLogItem;
}

export function ErrorLogEntryDialog({children, error}: Props) {
  return (
    <Dialog.Root>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent error={error} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({error}: {error: ErrorLogItem}) {
  return (
    <Dialog.Content className="h-full sm:max-w-full">
      <Dialog.Header className="flex-row items-center pe-12">
        <Dialog.Title className="flex-1">
          <Trans message="Error details" />
        </Dialog.Title>
        <Button
          variant="outline"
          color="default"
          size="sm"
          onClick={() => downloadLogItem(error)}
        >
          <Trans message="Download" />
        </Button>
      </Dialog.Header>
      <Dialog.Body>
        <pre className="text-xs leading-5 wrap-break-word whitespace-pre-wrap">
          {error.exception}
        </pre>
      </Dialog.Body>
    </Dialog.Content>
  );
}

function downloadLogItem(item: ErrorLogItem) {
  if (!item.exception) {
    return;
  }

  const el = document.createElement('a');
  el.setAttribute(
    'href',
    'data:text/plain;charset=utf-8,' + encodeURIComponent(item.exception),
  );
  el.setAttribute('download', `error-${item.id}.log`);

  el.style.display = 'none';
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
}
