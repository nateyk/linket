import {SendWebhookTestEventDialog} from '@app/account-settings/webhooks/send-webhook-test-event-dialog';
import {
  deleteWebhookOptions,
  disableWebhookOptions,
  enableWebhookOptions,
} from '@app/account-settings/webhooks/webhook-queries';
import {Webhook} from '@app/gen/schemas/webhook';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button, type ButtonVariantProps} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ClipboardClockIcon,
  MoreVerticalIcon,
  PencilIcon,
  SendIcon,
  TrashIcon,
} from 'lucide-react';
import {useState} from 'react';
import {Link} from 'react-router';

type Props = {
  webhook: Webhook;
  onToggleEnabled?: () => void;
  onDelete?: () => void;
  variant?: ButtonVariantProps['variant'];
  hideDetailsItems?: boolean;
};

export function WebhookActionsButton({
  webhook,
  onToggleEnabled,
  variant,
  onDelete,
  hideDetailsItems,
}: Props) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testEventDialogOpen, setTestEventDialogOpen] = useState(false);
  const disableWebhook = useMutation(disableWebhookOptions());
  const enableWebhook = useMutation(enableWebhookOptions());

  const handleDisable = () => {
    disableWebhook.mutate(webhook.id, {
      onSuccess: () => {
        toast.success(<Trans message="Webhook disabled" />);
        onToggleEnabled?.();
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  const handleEnable = () => {
    enableWebhook.mutate(webhook.id, {
      onSuccess: () => {
        toast.success(<Trans message="Webhook enabled" />);
        onDelete?.();
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <>
      {deleteDialogOpen && (
        <DeleteWebhookDialog
          webhookId={webhook.id}
          open
          onOpenChange={setDeleteDialogOpen}
        />
      )}
      {testEventDialogOpen && (
        <SendWebhookTestEventDialog
          webhook={webhook}
          open
          onOpenChange={setTestEventDialogOpen}
        />
      )}
      <Dropdown.Root>
        <Dropdown.Trigger
          render={<Button variant={variant ?? 'ghost'} size="icon-sm" />}
        >
          <MoreVerticalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content align="end">
          {!hideDetailsItems && (
            <Dropdown.LinkItem
              render={<Link to={`/account-settings/webhooks/${webhook.id}`} />}
            >
              <ClipboardClockIcon />
              <Trans message="Logs" />
            </Dropdown.LinkItem>
          )}
          {!hideDetailsItems && (
            <Dropdown.LinkItem
              render={
                <Link
                  to={`/account-settings/webhooks/${webhook.id}/settings`}
                />
              }
            >
              <PencilIcon />
              <Trans message="Edit" />
            </Dropdown.LinkItem>
          )}
          <Dropdown.Item onClick={() => setTestEventDialogOpen(true)}>
            <SendIcon />
            <Trans message="Send test event" />
          </Dropdown.Item>
          {webhook.deleted_at ? (
            <Dropdown.Item
              disabled={enableWebhook.isPending}
              onClick={() => handleEnable()}
            >
              <ArchiveRestoreIcon />
              <Trans message="Enable" />
            </Dropdown.Item>
          ) : (
            <Dropdown.Item
              disabled={disableWebhook.isPending}
              onClick={() => handleDisable()}
            >
              <ArchiveIcon />
              <Trans message="Disable" />
            </Dropdown.Item>
          )}
          <Dropdown.Item
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <TrashIcon />
            <Trans message="Delete" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </>
  );
}

type DeleteWebhookDialogProps = {
  webhookId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DeleteWebhookDialog({
  webhookId,
  open,
  onOpenChange,
}: DeleteWebhookDialogProps) {
  const deleteWebhook = useMutation(deleteWebhookOptions());

  const handleDelete = () => {
    deleteWebhook.mutate(webhookId, {
      onSuccess: () => {
        toast.success(<Trans message="Webhook deleted" />);
        onOpenChange(false);
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
              <Trans message="Delete webhook" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to delete this webhook?" />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deleteWebhook.isPending}
              onClick={() => handleDelete()}
            >
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
