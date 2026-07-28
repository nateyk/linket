import {ListNotificationSubscriptions200SubscriptionsItem} from '@app/gen/schemas/list-notification-subscriptions200-subscriptions-item';
import {
  listNotificationSubscriptionsOptions,
  updateNotificationSubscriptionsOptions,
} from '@common/notifications/notifications-queries';
import {Button} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {Fragment, useState} from 'react';
import {Navbar} from '../ui/navigation/navbar/navbar';

type Selection = Record<string, ChannelSelection>;

// {email: true, mobile: true, browser: false}
type ChannelSelection = Record<string, boolean>;

export function Component() {
  return (
    <div className="min-h-screen bg-muted">
      <Navbar.Root className="sticky top-0 z-10 border-b bg-background">
        <Navbar.Logo />
        <Navbar.Menu position="notifications-page" />
        <Navbar.Content className="ml-auto">
          <Navbar.AuthContent />
        </Navbar.Content>
      </Navbar.Root>

      <div className="mx-auto my-5 max-w-6xl px-2.5 md:my-10 md:px-5">
        <div className="rounded-card border bg-background px-5 pt-5 pb-7.5 shadow-xs">
          <NotificationSettings />
        </div>
      </div>
    </div>
  );
}

export function NotificationSettings() {
  const updateSettings = useMutation(updateNotificationSubscriptionsOptions());
  const {data} = useSuspenseQuery(listNotificationSubscriptionsOptions());
  const [selection, setSelection] = useState<Selection>(() => {
    const initialSelection: Selection = {};
    const initialValue: ChannelSelection = {};
    data.available_channels.forEach(channel => {
      initialValue[channel] = false;
    });

    data.subscriptions.forEach(group => {
      group.subscriptions.forEach(subscription => {
        const backendValue = data.user_selections.find(
          s => s.notif_id === subscription.notif_id,
        );
        initialSelection[subscription.notif_id] = backendValue?.channels || {
          ...initialValue,
        };
      });
    });

    return initialSelection;
  });

  return (
    <Fragment>
      {data.subscriptions.map(group => (
        <div key={group.group_name} className="mb-2.5 text-sm">
          <GroupRow
            key={group.group_name}
            group={group}
            allChannels={data?.available_channels}
            selection={selection}
            setSelection={setSelection}
          />
          {group.subscriptions.map(subscription => (
            <SubscriptionRow
              key={subscription.notif_id}
              subscription={subscription}
              selection={selection}
              setSelection={setSelection}
              allChannels={data?.available_channels}
            />
          ))}
        </div>
      ))}
      <Button
        className="mt-5 ml-2.5"
        disabled={updateSettings.isPending}
        onClick={() => {
          updateSettings.mutate(
            {
              selections: Object.entries(selection).map(
                ([notifId, channels]) => {
                  return {notif_id: notifId, channels};
                },
              ),
            },
            {
              onSuccess: () => {
                toast.success(<Trans message="Updated preferences" />);
              },
            },
          );
        }}
      >
        <Trans message="Update preferences" />
      </Button>
    </Fragment>
  );
}

interface GroupRowProps {
  group: ListNotificationSubscriptions200SubscriptionsItem;
  allChannels: string[];
  selection: Selection;
  setSelection: (value: Selection) => void;
}
function GroupRow({
  group,
  allChannels,
  selection,
  setSelection,
}: GroupRowProps) {
  const toggleAll = (channelName: string, value: boolean) => {
    const nextState = Object.entries(selection).reduce<Selection>(
      (newSelection, [notifId, channels]) => {
        newSelection[notifId] = {...channels, [channelName]: value};
        return newSelection;
      },
      {},
    );
    setSelection(nextState);
  };

  const checkboxes = (
    <div className="ml-auto flex items-center gap-10 max-md:hidden">
      {allChannels.map(channelName => {
        const allSelected = Object.values(selection).every(s => s[channelName]);
        const someSelected =
          !allSelected && Object.values(selection).some(s => s[channelName]);
        return (
          <label
            key={channelName}
            className="flex flex-col items-center gap-3 capitalize"
          >
            <Trans message={channelName} />
            <Checkbox
              bindToHookForm={false}
              indeterminate={someSelected}
              checked={allSelected}
              onCheckedChange={async () => {
                const newValue = !allSelected;
                if (channelName === 'browser') {
                  const granted = await requestBrowserPermission();
                  toggleAll(channelName, !granted ? false : newValue);
                } else {
                  toggleAll(channelName, newValue);
                }
              }}
              aria-label={channelName}
            />
          </label>
        );
      })}
    </div>
  );

  return (
    <div className="flex items-center border-b p-2.5">
      <div className="font-semibold">
        <Trans message={group.group_name} />
      </div>
      {checkboxes}
    </div>
  );
}

interface SubscriptionRowProps {
  subscription: {name: string; notif_id: string};
  allChannels: string[];
  selection: Selection;
  setSelection: (value: Selection) => void;
}
function SubscriptionRow({
  subscription,
  allChannels,
  selection,
  setSelection,
}: SubscriptionRowProps) {
  const notifId = subscription.notif_id;

  const toggleChannel = (channelName: string, value: boolean) => {
    setSelection({
      ...selection,
      [notifId]: {
        ...selection[notifId],
        [channelName]: value,
      },
    });
  };

  return (
    <div className="items-center border-b py-2.5 pr-2.5 pl-2 md:flex md:pl-5">
      <div className="pb-3.5 font-semibold md:pb-0 md:font-normal">
        <Trans message={subscription.name} />
      </div>
      <div className="ml-auto flex items-center gap-10">
        {allChannels.map(channelName => (
          <label
            key={channelName}
            className="flex flex-col items-center gap-1 capitalize"
          >
            <Checkbox
              bindToHookForm={false}
              checked={selection[notifId]?.[channelName] ?? false}
              onCheckedChange={async () => {
                const newValue = !selection[notifId]?.[channelName];
                if (channelName === 'browser') {
                  const granted = await requestBrowserPermission();
                  toggleChannel(channelName, !granted ? false : newValue);
                } else {
                  toggleChannel(channelName, newValue);
                }
              }}
              aria-label={channelName}
            />
            <span className="block md:invisible md:h-0">
              <Trans message={channelName} />
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function requestBrowserPermission(): Promise<boolean> {
  if (Notification.permission === 'granted') {
    return Promise.resolve(true);
  }
  if (Notification.permission === 'denied') {
    toast.error(
      <Trans message="Notifications blocked. Please enable them for this site from browser settings." />,
    );
    return Promise.resolve(false);
  }
  return Notification.requestPermission().then(permission => {
    return permission === 'granted';
  });
}
