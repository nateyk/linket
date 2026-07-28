import {batchUpdateLinksOptions} from '@app/dashboard/links/links-queries';
import {Link} from '@app/gen/schemas/link';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, ReactElement} from 'react';

type Props = {
  links: Link[];
  unarchive: boolean;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function ArchiveLinksDialog({
  open,
  onOpenChange,
  children,
  links,
  unarchive,
  onSuccess,
}: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <DialogContent
          links={links}
          unarchive={unarchive}
          onSuccess={onSuccess}
        />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DialogContent({
  links,
  unarchive,
  onSuccess,
}: Pick<Props, 'links' | 'unarchive' | 'onSuccess'>) {
  const batchUpdate = useMutation(batchUpdateLinksOptions());

  const handleConfirm = () => {
    batchUpdate.mutate(
      {
        ids: links.map(link => link.id),
        ...(unarchive ? {unarchive: true} : {archive: true}),
      },
      {
        onSuccess: () => {
          onSuccess();
          toast.success(
            unarchive ? (
              <Trans
                message="[one Link unarchived|other :count links unarchived]"
                values={{count: links.length}}
              />
            ) : (
              <Trans
                message="[one Link archived|other :count links archived]"
                values={{count: links.length}}
              />
            ),
          );
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  return (
    <AlertDialog.Content size="sm">
      <AlertDialog.Header>
        <AlertDialog.Title>
          {unarchive ? (
            <Trans
              message="Unarchive [one link|other :count links]"
              values={{count: links.length}}
            />
          ) : (
            <Trans
              message="Archive [one link|other :count links]"
              values={{count: links.length}}
            />
          )}
        </AlertDialog.Title>
        <AlertDialog.Description>
          {unarchive ? (
            <Trans
              message="Are you sure you want to unarchive [one this link|other selected links]?"
              values={{count: links.length}}
            />
          ) : (
            <Trans
              message="Are you sure you want to archive [one this link|other selected links]?"
              values={{count: links.length}}
            />
          )}
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>
          <Trans message="Cancel" />
        </AlertDialog.Cancel>
        <AlertDialog.Action
          disabled={batchUpdate.isPending}
          onClick={() => handleConfirm()}
        >
          {unarchive ? (
            <Trans message="Unarchive" />
          ) : (
            <Trans message="Archive" />
          )}
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}
