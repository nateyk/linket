import {FormattedDate} from '@ui/i18n/formatted-date';
import {message} from '@ui/i18n/message';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {Trans} from '@ui/i18n/trans';

type Linkeable = {
  name?: string | null;
  created_at?: string | null;
};

export function LinkeableName({linkeable}: {linkeable: Linkeable}) {
  if (linkeable.name) {
    return linkeable.name;
  }

  return (
    <Trans
      message="Untitled :dateCreated"
      values={{dateCreated: <FormattedDate date={linkeable.created_at} />}}
    />
  );
}

export function getLinkeableName(
  linkeable: Linkeable,
): string | MessageDescriptor {
  if (linkeable.name) {
    return linkeable.name;
  }

  return message('Untitled :dateCreated', {
    values: {
      dateCreated: linkeable.created_at
        ? linkeable.created_at.split('T')[0]
        : '',
    },
  });
}
