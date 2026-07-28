import {Trans} from '@ui/i18n/trans';
import {ReactNode} from 'react';

export type AvailableWebhookEvent = {
  value: string;
  label: ReactNode;
};

export type AvailableWebhookEventGroup = {
  groupName: ReactNode;
  items: AvailableWebhookEvent[];
};

export const availableWebhookEvents: AvailableWebhookEvent[] = [
  {value: 'link.created', label: <Trans message="Link created" />},
  {value: 'link.updated', label: <Trans message="Link updated" />},
  {value: 'link.deleted', label: <Trans message="Link deleted" />},
  {value: 'qrCode.created', label: <Trans message="QR code created" />},
  {value: 'qrCode.updated', label: <Trans message="QR code updated" />},
  {value: 'qrCode.deleted', label: <Trans message="QR code deleted" />},
  {value: 'folder.created', label: <Trans message="Folder created" />},
  {value: 'folder.updated', label: <Trans message="Folder updated" />},
  {value: 'folder.deleted', label: <Trans message="Folder deleted" />},
  {value: 'trackedEvent.clicked', label: <Trans message="Link clicked" />},
  {value: 'trackedEvent.scanned', label: <Trans message="QR code scanned" />},
];

export const availableWebhookEventsByGroup: AvailableWebhookEventGroup[] = [
  {
    groupName: <Trans message="Links" />,
    items: [
      availableWebhookEvents[0]!,
      availableWebhookEvents[1]!,
      availableWebhookEvents[2]!,
    ],
  },
  {
    groupName: <Trans message="QR codes" />,
    items: [
      availableWebhookEvents[3]!,
      availableWebhookEvents[4]!,
      availableWebhookEvents[5]!,
    ],
  },
  {
    groupName: <Trans message="Folders" />,
    items: [
      availableWebhookEvents[6]!,
      availableWebhookEvents[7]!,
      availableWebhookEvents[8]!,
    ],
  },
  {
    groupName: <Trans message="Tracked events" />,
    items: [availableWebhookEvents[9]!, availableWebhookEvents[10]!],
  },
];

export function webhookEventNameToFormFieldName(
  name: string,
): `event_${string}` {
  return `event_${name.replaceAll('.', '__')}`;
}

export function webhookFormFieldNameToEventName(fieldName: string): string {
  return fieldName.replace('event_', '').replaceAll('__', '.');
}
