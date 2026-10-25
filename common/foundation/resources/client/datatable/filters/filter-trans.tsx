import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';
import {ReactElement, ReactNode} from 'react';

export type TranslatableLabel = string | MessageDescriptor | ReactElement;

export function isMessageDescriptor(
  value: unknown,
): value is MessageDescriptor {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    !('props' in value)
  );
}

export function renderFilterLabel(label: TranslatableLabel): ReactNode {
  if (typeof label === 'string') {
    return label;
  }

  if (isMessageDescriptor(label)) {
    return <Trans {...label} />;
  }

  return label;
}

export function FilterTrans({label}: {label: TranslatableLabel}) {
  return <>{renderFilterLabel(label)}</>;
}
