import {
  biolinksBaseKey,
  deleteStoreOptions,
  listCurrentUserStoresOptions,
} from '@app/dashboard/stores/stores-queries';
import {useSelectedStoreId} from '@app/dashboard/stores/use-selected-store-id';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {queryClient} from '@common/http/query-client';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, ReactElement} from 'react';
import {useNavigate} from 'react-router';

type Props = {
  storeId: string | number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function DeleteBiolinkDialog({
  storeId,
  open,
  onOpenChange,
  children,
}: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <DialogContent storeId={storeId} onOpenChange={onOpenChange} />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DialogContent({
  storeId,
  onOpenChange,
}: Pick<Props, 'storeId' | 'onOpenChange'>) {
  const {routeType} = useDatatableRouteType();
  const navigate = useNavigate();
  const [selectedBiolinkId, setSelectedBiolinkId] = useSelectedStoreId();

  // override onSuccess from deleteStoreOptions so we can invalidate after navigating to the next biolink
  const deleteBiolink = useMutation({
    ...deleteStoreOptions(),
    onSuccess: async () => {
      toast.success(<Trans message="Link in bio deleted" />);

      if (routeType === 'admin') {
        navigate(`/admin/stores`);
        return;
      }

      const nextBiolinkId = queryClient
        .getQueryData(listCurrentUserStoresOptions().queryKey)
        ?.data.find((b: any) => b.id !== storeId)?.id;

      if (selectedBiolinkId == storeId) {
        if (nextBiolinkId) {
          setSelectedBiolinkId(nextBiolinkId);
          await navigate(`/${routeType}/stores/${nextBiolinkId}`);
        } else {
          setSelectedBiolinkId(null);
          await navigate(`/${routeType}/stores`);
        }
      }

      setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: biolinksBaseKey,
        });
      }, 100);

      onOpenChange(false);
    },
    onError: err => showHttpErrorToast(err),
  });

  return (
    <AlertDialog.Content size="sm">
      <AlertDialog.Header>
        <AlertDialog.Title>
          <Trans message="Delete link in bio" />
        </AlertDialog.Title>
        <AlertDialog.Description>
          <Trans message="Are you sure you want to delete this link in bio?" />
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>
          <Trans message="Cancel" />
        </AlertDialog.Cancel>
        <AlertDialog.Action
          color="danger"
          disabled={deleteBiolink.isPending}
          onClick={() => deleteBiolink.mutate(String(storeId))}
        >
          <Trans message="Delete" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}
