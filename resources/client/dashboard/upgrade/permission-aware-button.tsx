import {useUsage} from '@app/dashboard/use-usage';
import {GetUsage200Data} from '@app/gen/schemas/get-usage200-data';
import {PolicyFailReason} from '@app/gen/schemas/policy-fail-reason';
import {useAuth} from '@common/auth/use-auth';
import {PolicyFailMessagePopover} from '@common/billing/upgrade/policy-fail-message-popover';
import {Popover} from '@shadcn/popover/popover';
import {useTrans} from '@ui/i18n/use-trans';
import {ReactNode} from 'react';

type ResourceType =
  | 'link'
  | 'biolink'
  | 'linkOverlay'
  | 'linkPage'
  | 'customDomain'
  | 'folder'
  | 'trackingPixel'
  | 'qrCode';

type ResourceTypeOrResource =
  | ResourceType
  | {model_type: ResourceType; user_id?: number; user?: {id: number}};

type Action = 'create' | 'update' | 'delete';

function useTranslatedResourcesName(resource: ResourceTypeOrResource) {
  const {trans} = useTrans();
  const resourceType =
    typeof resource === 'object' ? resource.model_type : resource;
  switch (resourceType) {
    case 'link':
      return trans({message: 'links'});
    case 'biolink':
      return trans({message: 'biolinks'});
    case 'linkOverlay':
      return trans({message: 'link overlays'});
    case 'linkPage':
      return trans({message: 'link pages'});
    case 'customDomain':
      return trans({message: 'custom domains'});
    case 'folder':
      return trans({message: 'folders'});
    case 'trackingPixel':
      return trans({message: 'tracking pixels'});
    case 'qrCode':
      return trans({message: 'QR codes'});
  }
}

export function PermissionAwareButton({
  children,
  resource,
  action,
}: {
  children: ReactNode | ((policyFailed: boolean) => ReactNode);
  resource: ResourceTypeOrResource;
  action: Action;
}) {
  const result = usePolicyCheckResult(resource, action);
  const resourcesName = useTranslatedResourcesName(resource);

  const content =
    typeof children === 'function' ? children(result.allowed) : children;

  if (result.allowed) {
    return content;
  }

  return (
    <PolicyFailMessagePopover
      resourcesName={resourcesName}
      reason={result.reason ?? 'noPermission'}
      action={action}
    >
      <Popover.Trigger
        nativeButton={false}
        render={<span className="cursor-not-allowed opacity-50" />}
        openOnHover
        delay={0}
      >
        <span inert>{content}</span>
      </Popover.Trigger>
    </PolicyFailMessagePopover>
  );
}

export function usePolicyCheckResult(
  resource: ResourceTypeOrResource,
  action: Action,
): {allowed: boolean; reason?: PolicyFailReason} {
  const {user} = useAuth();
  const {data} = useUsage();

  const resourceName =
    typeof resource === 'object' ? resource.model_type : resource;

  // pluralize model type and convert to snake case
  const snakeCase = resourceName.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
  const usageKey = `${snakeCase}s` as keyof GetUsage200Data;

  const policyCheckResult =
    usageKey === 'tracked_events' ? null : data?.data[usageKey][action];

  if (!policyCheckResult) {
    return {allowed: false, reason: 'noPermission'};
  }

  if (typeof resource === 'object' && user) {
    const resourceUserId = resource.user_id ?? resource.user?.id;
    if (resourceUserId && resourceUserId === user.id) {
      return {allowed: true};
    }
  }

  return policyCheckResult;
}
