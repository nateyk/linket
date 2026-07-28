import {useAuth} from '@common/auth/use-auth';
import {useShouldShowUpgradeMessage} from '@common/billing/upgrade/no-permission-button';
import {useWorkspaceStore} from '@common/workspace/workspace-store';
import {LinkButton} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {ComponentProps, ReactElement, ReactNode} from 'react';
import {Link} from 'react-router';

export type PolicyFailReason =
  | 'overQuota'
  | 'noPermission'
  | 'noWorkspacePermission';

export type PolicyFailAction = 'create' | 'update' | 'delete';

type MessageTextProps = {
  resourcesName: ReactElement | string;
  reason: PolicyFailReason;
  action?: PolicyFailAction;
  embedActionLink?: boolean;
};
export function PolicyFailMessage({
  resourcesName,
  action = 'create',
  reason,
  embedActionLink = true,
}: MessageTextProps) {
  switch (action) {
    case 'create':
      return (
        <StoreFailMessage
          resourcesName={resourcesName}
          reason={reason}
          embedActionLink={embedActionLink}
        />
      );
    case 'update':
      return (
        <UpdateFailMessage resourcesName={resourcesName} reason={reason} />
      );
    case 'delete':
      return (
        <DestroyFailMessage resourcesName={resourcesName} reason={reason} />
      );
  }
}

export function PolicyFailActionButton({
  reason,
  ...props
}: {reason: PolicyFailReason} & Partial<ComponentProps<typeof LinkButton>>) {
  const shouldShowUpgradeMessage = useShouldShowUpgradeMessage();

  if (
    shouldShowUpgradeMessage &&
    (reason === 'overQuota' || reason === 'noPermission')
  ) {
    return (
      <LinkButton
        to="/pricing"
        target="_blank"
        variant="default"
        color="primary"
        size="sm"
        {...props}
      >
        <Trans message="Upgrade now" />
      </LinkButton>
    );
  }

  return null;
}

function StoreFailMessage({
  resourcesName,
  reason,
  embedActionLink,
}: Pick<MessageTextProps, 'resourcesName' | 'reason' | 'embedActionLink'>) {
  const {billing} = useSettings();
  const {user} = useAuth();
  const activeWorkspace = useWorkspaceStore(s => s.activeWorkspace);
  const isOwner = activeWorkspace?.owner_id === user?.id;
  const billingEnabled = !!billing?.enable;

  if (reason === 'noWorkspacePermission') {
    return (
      <Trans
        message="You don't have permissions to create :resources in this workspace."
        values={{resources: resourcesName}}
      />
    );
  }

  const values = {
    resources: resourcesName,
    a: (text: string) =>
      embedActionLink ? (
        <EmbeddedActionLink>{text}</EmbeddedActionLink>
      ) : (
        <>{text}</>
      ),
  };

  if (reason === 'overQuota') {
    if (!isOwner) {
      return (
        <Trans
          message="This workspace reached the limit for :resources allowed."
          values={values}
        />
      );
    }
    if (billingEnabled) {
      return (
        <Trans
          message="You've reached the limit for :resources allowed for your current plan. <a>Upgrade to continue.</a>"
          values={values}
        />
      );
    }
    return (
      <Trans
        message="You've reached the limit for :resources allowed."
        values={values}
      />
    );
  }

  if (reason === 'noPermission') {
    if (!isOwner) {
      return (
        <Trans
          message=":resources can't be created in this workspace."
          values={{resources: resourcesName}}
        />
      );
    }
    if (billingEnabled) {
      return (
        <Trans
          message="Your current plan does not allow creating :resources. <a>Upgrade to continue.</a>"
          values={values}
        />
      );
    }
  }

  return (
    <Trans
      message="You don't have permissions to create :resources."
      values={{resources: resourcesName}}
    />
  );
}

function UpdateFailMessage({
  resourcesName,
  reason,
}: Pick<MessageTextProps, 'resourcesName' | 'reason'>) {
  if (reason === 'noWorkspacePermission') {
    return (
      <Trans
        message="You don't have permissions to update :resources in this workspace."
        values={{resources: resourcesName}}
      />
    );
  }

  return (
    <Trans
      message="you don't have permissions to update :resources."
      values={{resources: resourcesName}}
    />
  );
}

function DestroyFailMessage({
  resourcesName,
  reason,
}: Pick<MessageTextProps, 'resourcesName' | 'reason'>) {
  if (reason === 'noWorkspacePermission') {
    return (
      <Trans
        message="You don't have permissions to delete :resources in this workspace."
        values={{resources: resourcesName}}
      />
    );
  }

  return (
    <Trans
      message="You don't have permissions to delete :resources."
      values={{resources: resourcesName}}
    />
  );
}

function EmbeddedActionLink({children}: {children: ReactNode}) {
  return (
    <Link
      className="cursor-pointer font-medium underline decoration-dotted underline-offset-2"
      to="/pricing"
    >
      {children}
    </Link>
  );
}
