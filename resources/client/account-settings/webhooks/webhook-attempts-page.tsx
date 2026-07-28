import {availableWebhookEvents} from '@app/account-settings/webhooks/available-webhook-events';
import {listWebhookAttemptsOptions} from '@app/account-settings/webhooks/webhook-queries';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Empty} from '@shadcn/empty/empty';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {useSuspenseQuery} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {
  CircleCheckBigIcon,
  CircleXIcon,
  ClipboardClockIcon,
} from 'lucide-react';
import {parseAsInteger, useQueryState} from 'nuqs';
import {Link} from 'react-router';

export function Component() {
  const {webhookId} = useRequiredParams(['webhookId']);
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const attemptsQuery = useSuspenseQuery(
    listWebhookAttemptsOptions(webhookId, {page}),
  );
  const attempts = attemptsQuery.data.data ?? [];

  if (!attempts.length) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <Empty.Root className="rounded-card border border-dashed">
          <Empty.Header>
            <Empty.Media variant="icon">
              <ClipboardClockIcon />
            </Empty.Media>
            <Empty.Title>
              <Trans message="No webhook calls yet" />
            </Empty.Title>
            <Empty.Description>
              <Trans message="You will be able to see the details for all webhook calls here" />
            </Empty.Description>
          </Empty.Header>
        </Empty.Root>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      {attempts.map(attempt => (
        <Link
          key={attempt.id}
          to={`/account-settings/webhooks/${webhookId}/logs/${attempt.id}`}
          className="flex cursor-pointer items-center justify-between gap-3 border-b p-3.5 text-sm last:border-b-0 hover:bg-hover"
        >
          <DeliveryStatusIcon responseStatus={attempt.response_status} />
          <div className="font-medium text-muted-foreground">
            {attempt.response_status ?? '000'}
          </div>
          <span className="ml-2.5">
            <EventName eventType={attempt.delivery?.event_type} />
          </span>
          <div className="ml-auto text-sm text-muted-foreground">
            <FormattedDate date={attempt.created_at} preset="timestamp" />
          </div>
        </Link>
      ))}
      <BackendPagination
        className="mt-3"
        response={attemptsQuery.data}
        onPageChange={page => setPage(page)}
      />
    </div>
  );
}

function EventName({eventType}: {eventType: string | undefined}) {
  if (!eventType) {
    return <Trans message="Unknown event" />;
  }

  const event = availableWebhookEvents.find(r => r.value === eventType);

  return event ? event.label : eventType;
}

type DeliveryStatusIconProps = {
  responseStatus: number | null;
};
function DeliveryStatusIcon({responseStatus}: DeliveryStatusIconProps) {
  if (responseStatus && responseStatus >= 200 && responseStatus < 300) {
    return <CircleCheckBigIcon className="size-4 text-positive" />;
  }
  return <CircleXIcon className="size-4 text-destructive" />;
}
