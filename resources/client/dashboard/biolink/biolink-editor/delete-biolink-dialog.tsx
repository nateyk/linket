import {
  biolinksBaseKey,
  deleteBiolinkOptions,
  listCurrentUserBiolinksOptions,
} from '@app/dashboard/biolink/biolinks-queries';
import {useSelectedBiolinkId} from '@app/dashboard/biolink/use-selected-biolink-id';
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
  biolinkId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function DeleteBiolinkDialog({
  biolinkId,
  open,
  onOpenChange,
  children,
}: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <DialogContent biolinkId={biolinkId} onOpenChange={onOpenChange} />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DialogContent({
  biolinkId,
  onOpenChange,
}: Pick<Props, 'biolinkId' | 'onOpenChange'>) {
  const {routeType} = useDatatableRouteType();
  const navigate = useNavigate();
  const [selectedBiolinkId, setSelectedBiolinkId] = useSelectedBiolinkId();

  // override onSuccess from deleteBiolinkOptions so we can invalidate after navigating to the next biolink
  const deleteBiolink = useMutation({
    ...deleteBiolinkOptions(),
    onSuccess: async () => {
      toast.success(<Trans message="Link in bio deleted" />);

      if (routeType === 'admin') {
        navigate(`/admin/biolinks`);
        return;
      }

      const nextBiolinkId = queryClient
        .getQueryData(listCurrentUserBiolinksOptions().queryKey)
        ?.data.find(b => b.id !== biolinkId)?.id;

      if (selectedBiolinkId == biolinkId) {
        if (nextBiolinkId) {
          setSelectedBiolinkId(nextBiolinkId);
          await navigate(`/${routeType}/biolinks/${nextBiolinkId}`);
        } else {
          setSelectedBiolinkId(null);
          await navigate(`/${routeType}/biolinks`);
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
          onClick={() => deleteBiolink.mutate(biolinkId)}
        >
          <Trans message="Delete" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}
