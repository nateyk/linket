import {Subscription} from '@app/gen/schemas/subscription';
import {
  cancelSubscriptionOptions,
  resumeSubscriptionOptions,
} from '@common/admin/subscriptions/subscriptions-queries';
import {UpdateSubscriptionDialog} from '@common/admin/subscriptions/update-subscription-dialog';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {toast} from '@shadcn/toast/toast';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useMutation} from '@tanstack/react-query';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {EditIcon, EllipsisIcon, PauseIcon, PlayIcon, XIcon} from 'lucide-react';
import {useState} from 'react';
import {Link} from 'react-router';

export const subscriptionDatatableColumns: ColumnDef<Subscription>[] = [
  {
    id: 'user_id',
    accessorKey: 'user_id',
    enableSorting: true,
    size: 250,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Customer" />
      </SortableHeader>
    ),
    cell: ({row}) => {
      const subscription = row.original;
      if (!subscription.user) {
        return null;
      }

      return (
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <Link
                to={`/admin/users/${subscription.user.id}`}
                className="group flex w-max items-center gap-2"
              />
            }
          >
            <Avatar.Root size="sm">
              <Avatar.Image
                src={subscription.user.image ?? undefined}
                alt={subscription.user.name ?? ''}
              />
              <Avatar.ColorFallback>
                {subscription.user.name}
              </Avatar.ColorFallback>
            </Avatar.Root>
            <span className="min-w-0 truncate group-hover:underline">
              {subscription.user.name}
            </span>
          </Tooltip.Trigger>
          <Tooltip.Content>{subscription.user.email}</Tooltip.Content>
        </Tooltip.Root>
      );
    },
  },
  {
    id: 'status',
    header: () => <Trans message="Status" />,
    cell: ({row}) => {
      const subscription = row.original;

      return (
        <Badge variant={statusColor(subscription)} className="w-max capitalize">
          {subscription.gateway_status}
        </Badge>
      );
    },
  },
  {
    id: 'product_id',
    accessorKey: 'product_id',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Plan" />
      </SortableHeader>
    ),
    cell: ({row}) => row.original.product?.name,
  },
  {
    id: 'gateway_name',
    accessorKey: 'gateway_name',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Gateway" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <span className="capitalize">{row.original.gateway_name}</span>
    ),
  },
  {
    id: 'renews_at',
    accessorKey: 'renews_at',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Renews at" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <time>
        <FormattedDate date={row.original.renews_at} />
      </time>
    ),
  },
  {
    id: 'ends_at',
    accessorKey: 'ends_at',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Ends at" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <time>
        <FormattedDate date={row.original.ends_at} />
      </time>
    ),
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Created at" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <time>
        <FormattedDate date={row.original.created_at} />
      </time>
    ),
  },
  {
    id: 'actions',
    size: 1,
    header: () => (
      <span className="hidden">
        <Trans message="Actions" />
      </span>
    ),
    cell: ({row}) => <SubscriptionActionsButton subscription={row.original} />,
  },
];

export function SubscriptionActionsButton({
  subscription,
}: {
  subscription: Subscription;
}) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <div className="flex justify-end text-muted-foreground">
        <Dropdown.Root>
          <Dropdown.Trigger render={<Button variant="ghost" size="icon-sm" />}>
            <EllipsisIcon />
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Dropdown.Item onClick={() => setEditDialogOpen(true)}>
              <EditIcon />
              <Trans message="Edit subscription" />
            </Dropdown.Item>
            {subscription.cancelled && subscription.on_grace_period ? (
              <Dropdown.Item onClick={() => setResumeDialogOpen(true)}>
                <PlayIcon />
                <Trans message="Renew subscription" />
              </Dropdown.Item>
            ) : null}
            {subscription.active ? (
              <Dropdown.Item onClick={() => setSuspendDialogOpen(true)}>
                <PauseIcon />
                <Trans message="Cancel subscription" />
              </Dropdown.Item>
            ) : null}
            <Dropdown.Item
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <XIcon />
              <Trans message="Delete subscription" />
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
      <UpdateSubscriptionDialog
        subscription={subscription}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
      <SuspendSubscriptionDialog
        subscription={subscription}
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
      />
      <ResumeSubscriptionDialog
        subscription={subscription}
        open={resumeDialogOpen}
        onOpenChange={setResumeDialogOpen}
      />
      <DeleteSubscriptionDialog
        subscription={subscription}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}

type SubscriptionDialogProps = {
  subscription: Subscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function SuspendSubscriptionDialog({
  subscription,
  open,
  onOpenChange,
}: SubscriptionDialogProps) {
  const cancelSubscription = useMutation(cancelSubscriptionOptions());

  const handleSuspend = () => {
    cancelSubscription.mutate(
      {subscriptionId: subscription.id},
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success(<Trans message="Subscription cancelled." />);
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Cancel subscription" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="This will put user on grace period until their next scheduled renewal date. Subscription can be renewed until that date by user or from admin area." />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              disabled={cancelSubscription.isPending}
              onClick={() => handleSuspend()}
            >
              <Trans message="Confirm" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function ResumeSubscriptionDialog({
  subscription,
  open,
  onOpenChange,
}: SubscriptionDialogProps) {
  const resumeSubscription = useMutation(resumeSubscriptionOptions());

  const handleResume = () => {
    resumeSubscription.mutate(subscription.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success(<Trans message="Subscription renewed." />);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Resume subscription" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="This will put user on their original plan and billing cycle." />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              disabled={resumeSubscription.isPending}
              onClick={() => handleResume()}
            >
              <Trans message="Confirm" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DeleteSubscriptionDialog({
  subscription,
  open,
  onOpenChange,
}: SubscriptionDialogProps) {
  const cancelSubscription = useMutation(cancelSubscriptionOptions());

  const handleDelete = () => {
    cancelSubscription.mutate(
      {subscriptionId: subscription.id, deleteSubscription: true},
      {
        onSuccess: () => {
          onOpenChange(false);
          toast.success(<Trans message="Subscription deleted." />);
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Delete subscription" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="This will permanently delete the subscription and immediately cancel it on billing gateway. Subscription will not be renewable anymore." />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={cancelSubscription.isPending}
              onClick={() => handleDelete()}
            >
              <Trans message="Confirm" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function statusColor(subscription: Subscription) {
  if (
    subscription.gateway_status === 'incomplete' ||
    subscription.gateway_status === 'trialing'
  ) {
    return 'secondary';
  }

  return subscription.active ? 'positive' : 'destructive';
}
