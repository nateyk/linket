import {AccountSettingsPageLayout} from '@app/account-settings/account-settings-page-layout';
import {availableWebhookEvents} from '@app/account-settings/webhooks/available-webhook-events';
import {WebhookActionsButton} from '@app/account-settings/webhooks/webhook-actions-button';
import {listWebhooksOptions} from '@app/account-settings/webhooks/webhook-queries';
import {Webhook} from '@app/gen/schemas/webhook';
import {useAuth} from '@common/auth/use-auth';
import {NoFeaturePermissionPopover} from '@common/billing/upgrade/no-permission-button';
import {RemoteFavicon} from '@common/ui/other/remote-favicon';
import {Badge} from '@shadcn/badge/badge';
import {LinkButton} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {useSuspenseQuery} from '@tanstack/react-query';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {ignoreEventsFromPortal} from '@ui/utils/dom/ignore-events-from-portal';
import {
  AlertCircleIcon,
  PlusIcon,
  TrendingUpIcon,
  WebhookIcon,
} from 'lucide-react';
import {useNavigate} from 'react-router';

export function Component() {
  const {branding} = useSettings();
  const query = useSuspenseQuery(listWebhooksOptions());
  const webhooks = query.data.data;

  return (
    <AccountSettingsPageLayout
      title={<Trans message="Webhooks" />}
      headerRightContent={<NewWebhookButton />}
    >
      <div className="flex flex-col gap-6">
        {webhooks.length ? (
          <div className="flex flex-col gap-3">
            {webhooks.map(webhook => (
              <WebhookCard key={webhook.id} webhook={webhook} />
            ))}
          </div>
        ) : (
          <WebhooksEmptyState siteName={branding.site_name} />
        )}
      </div>
    </AccountSettingsPageLayout>
  );
}

type WebhookCardProps = {
  webhook: Webhook;
};
function WebhookCard({webhook}: WebhookCardProps) {
  const navigate = useNavigate();
  return (
    <div
      className="cursor-pointer rounded-card border border-border/80 bg-background p-4 transition-shadow hover:shadow-sm"
      onClick={ignoreEventsFromPortal(e => {
        if (!(e.target as HTMLElement).closest('a, button, input')) {
          navigate(`${webhook.id}`);
        }
      })}
    >
      <div className="mb-3.5 flex items-center gap-3">
        <div className="flex shrink-0 items-center justify-center rounded-input border border-border/80 p-2.5">
          <RemoteFavicon url={webhook.url} size="size-5.5" />
        </div>
        <div className="min-w-0 flex-auto">
          <div className="flex items-center gap-2">
            <div className="truncate text-base font-semibold">
              {webhook.name}
            </div>
            {webhook.deleted_at ? (
              <Badge variant="destructive">
                <Trans message="Disabled" />
              </Badge>
            ) : null}
          </div>
          <div className="truncate text-sm text-muted-foreground">
            {webhook.url}
          </div>
        </div>
        {webhook.delivery_attempts_count ? (
          <LinkButton
            variant="outline"
            color="default"
            size="xs"
            to={`/account-settings/webhooks/${webhook.id}`}
          >
            <TrendingUpIcon />
            <Trans
              message=":count deliveries"
              values={{
                count: (
                  <FormattedNumber value={webhook.delivery_attempts_count} />
                ),
              }}
            />
          </LinkButton>
        ) : null}
        <WebhookActionsButton webhook={webhook} />
      </div>
      <div className="flex flex-wrap gap-2">
        {webhook.selected_events.map(eventType => (
          <Badge key={eventType} variant="secondary">
            <EventName eventType={eventType} />
          </Badge>
        ))}
      </div>
      {webhook.consecutive_failures > 0 ? (
        <div className="mt-3.5 flex items-center gap-2 text-xs text-destructive">
          <AlertCircleIcon className="size-4" />
          <Trans
            message="Consecutive failures: :count"
            values={{count: webhook.consecutive_failures}}
          />
        </div>
      ) : null}
    </div>
  );
}

function NewWebhookButton() {
  const {billing} = useSettings();
  const {hasPermission} = useAuth();

  if (!billing?.enable && !hasPermission('webhooks.create')) {
    return (
      <NoFeaturePermissionPopover.Root
        message={
          <Trans message="Your current plan doesn't include webhooks functionality." />
        }
      >
        <NoFeaturePermissionPopover.ButtonTrigger
          size="default"
          color="primary"
          variant="default"
        />
      </NoFeaturePermissionPopover.Root>
    );
  }

  return (
    <LinkButton
      variant="default"
      color="primary"
      to="/account-settings/webhooks/new"
    >
      <PlusIcon />
      <Trans message="New webhook" />
    </LinkButton>
  );
}

function WebhooksEmptyState({siteName}: {siteName: string | undefined}) {
  return (
    <Empty.Root className="rounded-card border border-dashed">
      <Empty.Header>
        <Empty.Media variant="icon">
          <WebhookIcon />
        </Empty.Media>
        <Empty.Title>
          <Trans message="No webhooks yet" />
        </Empty.Title>
        <Empty.Description>
          <Trans
            message="Receive real-time http requests when a specific event (e.g. someone clicked your link) occure in :siteName."
            values={{siteName}}
          />
        </Empty.Description>
      </Empty.Header>
    </Empty.Root>
  );
}

function EventName({eventType}: {eventType: string | undefined}) {
  if (!eventType) {
    return <Trans message="Unknown event" />;
  }

  const event = availableWebhookEvents.find(r => r.value === eventType);

  return event ? event.label : eventType;
}
