import {
  UpdateEvent,
  UpdateStepStatus,
} from '@common/admin/settings/pages/system-settings/update-page/updater-types';
import {Trans} from '@ui/i18n/trans';
import {ProgressCircle} from '@ui/progress/progress-circle';
import {cn} from '@ui/utils/cn';
import {CheckCircleIcon, TriangleAlertIcon} from 'lucide-react';

type EventMessageProps = {
  event: UpdateEvent;
};
export function UpdateEventMessage({event}: EventMessageProps) {
  return (
    <div
      className={cn(
        event.status === UpdateStepStatus.Completed && 'opacity-50',
      )}
    >
      <div className="flex items-center gap-2">
        <EventStatusIndicator event={event} />
        <div>{event.message}</div>
      </div>
      {event.context?.error ? (
        <div className="mt-0.5 text-sm wrap-break-word text-destructive">
          <Trans message="Update failed:" /> {event.context.error}
        </div>
      ) : null}
    </div>
  );
}

function EventStatusIndicator({event}: EventMessageProps) {
  switch (event.status) {
    case UpdateStepStatus.Active:
      return (
        <ProgressCircle
          isIndeterminate={!event.context?.progressPercentage}
          size="w-6 h-6"
          value={event.context?.progressPercentage}
        />
      );
    case UpdateStepStatus.Completed:
      return <CheckCircleIcon className="size-6 text-positive" />;
    case UpdateStepStatus.Failed:
      return <TriangleAlertIcon className="size-6 text-destructive" />;
  }
}
