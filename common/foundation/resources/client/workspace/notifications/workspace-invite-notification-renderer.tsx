import {Notification} from '@app/gen/schemas/notification';
import {NotificationData} from '@app/gen/schemas/notification-data';
import {apiErrorStatusIs} from '@common/http/errors/parsed-api-error';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {queryClient} from '@common/http/query-client';
import {
  NotificationListItem,
  NotificationListItemProps,
} from '@common/notifications/notification-list';
import {NotificationsDialogContext} from '@common/notifications/notifications-dialog';
import {notificationsBaseKey} from '@common/notifications/notifications-queries';
import {
  deleteWorkspaceInviteOptions,
  joinWorkspaceOptions,
} from '@common/workspace/workspace-queries';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {use} from 'react';

export type WorkspaceInviteNotification = Omit<Notification, 'data'> & {
  data: NotificationData & {inviteId: string};
};

export function WorkspaceInviteNotificationRenderer(
  props: NotificationListItemProps,
) {
  const {notification} = props;
  const joinWorkspace = useMutation(joinWorkspaceOptions());
  const deleteInvite = useMutation(deleteWorkspaceInviteOptions());
  const {setOpen} = use(NotificationsDialogContext);

  const handleDeleteInvite = (inviteId: string) => {
    deleteInvite.mutate(inviteId, {
      onSuccess: () => {
        setOpen(false);
        toast.success(<Trans message="Invite declined" />);
        queryClient.invalidateQueries({queryKey: notificationsBaseKey});
      },
      onError: err => {
        if (apiErrorStatusIs(err, 404)) {
          queryClient.invalidateQueries({queryKey: notificationsBaseKey});
          toast.success(<Trans message="This invite is no longer valid" />);
          setOpen(false);
        } else {
          showHttpErrorToast(err);
        }
      },
    });
  };

  const handleJoinWorkspace = (inviteId: string) => {
    joinWorkspace.mutate(inviteId, {
      onSuccess: () => {
        setOpen(false);
        toast.success(<Trans message="Joined workspace" />);
        queryClient.invalidateQueries({queryKey: notificationsBaseKey});
      },
      onError: err => {
        if (apiErrorStatusIs(err, 404)) {
          queryClient.invalidateQueries({queryKey: notificationsBaseKey});
          toast.success(<Trans message="This invite is no longer valid" />);
          setOpen(false);
        } else {
          showHttpErrorToast(err);
        }
      },
    });
  };

  return (
    <NotificationListItem
      {...props}
      onActionButtonClick={(e, {action}) => {
        const data = (notification as WorkspaceInviteNotification).data;
        if (action === 'join') {
          handleJoinWorkspace(data.inviteId);
        }
        if (action === 'decline') {
          handleDeleteInvite(data.inviteId);
        }
      }}
    />
  );
}
