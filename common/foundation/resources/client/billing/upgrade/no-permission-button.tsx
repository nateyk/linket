import {useAuth} from '@common/auth/use-auth';
import {PolicyFailActionButton} from '@common/billing/upgrade/policy-fail-message';
import {useWorkspaceStore} from '@common/workspace/workspace-store';
import {Button} from '@shadcn/button/button';
import {Popover} from '@shadcn/popover/popover';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {CrownIcon, LockKeyholeIcon} from 'lucide-react';
import {ComponentProps, ReactNode} from 'react';

function NoFeaturePermissionPopoverRoot({
  children,
  message,
}: {
  children: ReactNode;
  message: ReactNode;
}) {
  const canUpgrade = useShouldShowUpgradeMessage();
  if (!canUpgrade) {
    message = (
      <Trans message="You don't have permissions to access this feature." />
    );
  }

  return (
    <Popover.Root>
      {children}
      <Popover.Portal>
        <Popover.Content>
          <p className="text-center leading-snug text-pretty">{message}</p>
          {canUpgrade && (
            <PolicyFailActionButton reason="noPermission" className="w-full" />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

type TriggerProps = ComponentProps<typeof Button>;

function IconTrigger({className, children, ...buttonProps}: TriggerProps) {
  const defaultIcon = useShouldShowUpgradeMessage() ? (
    <CrownIcon />
  ) : (
    <LockKeyholeIcon />
  );
  return (
    <Popover.Trigger
      openOnHover
      delay={0}
      className={className}
      render={<Button color="default" size="icon-sm" {...buttonProps} />}
    >
      {children ?? defaultIcon}
    </Popover.Trigger>
  );
}

function ButtonTrigger({className, children, ...buttonProps}: TriggerProps) {
  const defaultContent = useShouldShowUpgradeMessage() ? (
    <>
      <CrownIcon />
      <Trans message="Upgrade" />
    </>
  ) : (
    <>
      <LockKeyholeIcon />
      <Trans message="Locked" />
    </>
  );
  return (
    <Popover.Trigger
      openOnHover
      delay={0}
      className={className}
      render={<Button color="default" size="xs" {...buttonProps} />}
    >
      {children ? children : defaultContent}
    </Popover.Trigger>
  );
}

export const NoFeaturePermissionPopover = Object.assign(
  NoFeaturePermissionPopoverRoot,
  {
    Root: NoFeaturePermissionPopoverRoot,
    IconTrigger,
    ButtonTrigger,
  },
);

export function useShouldShowUpgradeMessage(): boolean {
  const {billing} = useSettings();
  const {user} = useAuth();
  const activeWorkspace = useWorkspaceStore(s => s.activeWorkspace);

  // should only show upgrade messages to workspace owner, but also check if if there's
  // any active workspace, if not, we are not inside a workspace scoped part of app.
  if (activeWorkspace && activeWorkspace.owner_id !== user?.id) {
    return false;
  }

  return !!billing?.enable;
}
