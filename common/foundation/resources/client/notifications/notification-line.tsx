import {Notification} from '@app/gen/schemas/notification';
import {NotificationData} from '@app/gen/schemas/notification-data';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {MixedImage} from '@ui/images/mixed-image';
import clsx from 'clsx';
import {JSXElementConstructor} from 'react';

type Props = {
  notification: Notification;
  line: NotificationData['lines'][number];
  index: number;
  iconRenderer?: JSXElementConstructor<{icon: string}>;
};

export function NotificationLine({
  notification,
  line,
  index,
  iconRenderer,
}: Props) {
  const isPrimary = line.type === 'primary' || index === 0;
  const Icon = iconRenderer || DefaultIconRenderer;
  const Element = line.action ? 'a' : 'div';

  return (
    <>
      <Element
        key={index}
        className={clsx(
          'flex items-center gap-2',
          line.action && 'hover:underline',
          isPrimary
            ? 'mnarktext-foreground text-sm whitespace-nowrap'
            : 'mt-1.5 text-xs text-muted-foreground',
        )}
        href={line.action?.action}
        title={line.action?.label}
      >
        {line.icon && <Icon icon={line.icon} />}
        <div
          className="overflow-hidden text-ellipsis"
          dangerouslySetInnerHTML={{__html: line.content}}
        />
      </Element>
      {index === 0 && (
        <time className="text-xs text-muted-foreground">
          <FormattedRelativeTime date={notification.created_at} />
        </time>
      )}
    </>
  );
}

interface DefaultIconRendererProps {
  icon: string;
}
function DefaultIconRenderer({icon}: DefaultIconRendererProps) {
  return <MixedImage src={icon} />;
}
