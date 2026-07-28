import {
  PolicyFailAction,
  PolicyFailActionButton,
  PolicyFailMessage,
  PolicyFailReason,
} from '@common/billing/upgrade/policy-fail-message';
import {Popover} from '@shadcn/popover/popover';
import {ComponentProps, ReactElement} from 'react';

export function PolicyFailMessagePopover({
  resourcesName,
  reason,
  action,
  children,
}: {
  resourcesName: ReactElement | string;
  children: ReactElement<ComponentProps<typeof Popover.Trigger>>;
  reason: PolicyFailReason;
  action?: PolicyFailAction;
}) {
  const message = (
    <PolicyFailMessage
      resourcesName={resourcesName}
      embedActionLink={false}
      reason={reason}
      action={action}
    />
  );

  return (
    <Popover.Root>
      {children}
      <Popover.Portal>
        <Popover.Content>
          <p className="text-center leading-snug text-pretty">{message}</p>
          <PolicyFailActionButton reason={reason} className="w-full" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
