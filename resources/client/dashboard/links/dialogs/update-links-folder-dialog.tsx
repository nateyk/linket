import {LinkFolderField} from '@app/dashboard/links/forms/link-folder-field';
import {batchUpdateLinksOptions} from '@app/dashboard/links/links-queries';
import {Folder} from '@app/gen/schemas/folder';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useForm} from 'react-hook-form';

type FormValue = {
  folder?: Folder | null;
};

type Props = {
  linkIds: number[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  onSuccess?: () => void;
};

export function UpdateLinksFolderDialog({
  linkIds,
  open: propsOpen,
  onOpenChange: propsOnOpenChange,
  onSuccess,
  children,
}: Props) {
  const [open, onOpenChange] = useControlledState(
    propsOpen,
    false,
    propsOnOpenChange,
  );
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent
          linkIds={linkIds}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  linkIds,
  onClose,
  onSuccess,
}: Pick<Props, 'linkIds' | 'onSuccess'> & {onClose: () => void}) {
  const form = useForm<FormValue>({
    defaultValues: {folder: null},
  });
  const batchUpdate = useMutation(batchUpdateLinksOptions());

  const handleSubmit = (values: FormValue) => {
    batchUpdate.mutate(
      {
        ids: linkIds,
        folder_id: values.folder ? values.folder.id : null,
      },
      {
        onSuccess: () => {
          toast.success(
            <Trans
              message="[one Link|other :count links] updated"
              values={{count: linkIds.length}}
            />,
          );
          onSuccess?.();
          onClose();
        },
        onError: err => onFormQueryError(err, form),
      },
    );
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans
              message="Update folder for [one link|other :count links]"
              values={{count: linkIds.length}}
            />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <LinkFolderField />
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={batchUpdate.isPending}>
            <Trans message="Update" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}
