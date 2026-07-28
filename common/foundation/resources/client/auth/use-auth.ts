import {User} from '@app/gen/schemas/user';
import {PolicyFailReason} from '@common/billing/upgrade/policy-fail-message';
import {BootstrapData} from '@ui/bootstrap-data/bootstrap-data';
import {
  getBootstrapData,
  useBootstrapDataStore,
} from '@ui/bootstrap-data/bootstrap-data-store';
import {getFromLocalStorage} from '@ui/utils/hooks/local-storage';
import {useMemo} from 'react';

type OnboardingState = {
  productId: number;
  priceId: number;
} | null;

interface UseAuthReturn {
  user: User | null;
  hasPermission: (permission: string) => boolean;
  getPermission: (
    permission: string,
  ) => Required<User>['permissions'][number] | undefined;
  getRestrictionValue: (
    permission: string,
    restriction: string,
  ) => string | number | boolean | undefined | null;
  checkOverQuotaOrNoPermission: (
    permission: string,
    restrictionName: string,
    currentCount: number,
  ) => PolicyFailReason | null;
  hasRole: (roleId: number) => boolean;
  isLoggedIn: boolean;
  isSubscribed: boolean;
  getRedirectUri: () => string;
}

export function useAuth(): UseAuthReturn {
  const data = useBootstrapDataStore(s => s.data);
  return useMemo(() => {
    const auth = new _Auth(data);
    return {
      user: auth.user,
      hasPermission: auth.hasPermission.bind(auth),
      getPermission: auth.getPermission.bind(auth),
      getRestrictionValue: auth.getRestrictionValue.bind(auth),
      checkOverQuotaOrNoPermission:
        auth.checkOverQuotaOrNoPermission.bind(auth),
      hasRole: auth.hasRole.bind(auth),
      isLoggedIn: auth.isLoggedIn,
      isSubscribed: auth.isSubscribed,
      getRedirectUri: auth.getRedirectUri.bind(auth),
    };
  }, [data]);
}

class _Auth {
  get data() {
    return this._data ?? getBootstrapData();
  }

  constructor(private _data?: BootstrapData) {}

  get user() {
    return this.data.user;
  }

  get isLoggedIn(): boolean {
    return !!this.user;
  }

  get isSubscribed(): boolean {
    return this.user?.subscription?.valid != null;
  }

  get guestRole() {
    return this.data.guest_role;
  }

  getPermission(
    name: string,
  ): Required<User>['permissions'][number] | undefined {
    const permissions = this.user?.permissions || this.guestRole?.permissions;
    if (!permissions) return;
    return permissions.find(p => p.name === name);
  }

  hasPermission(name: string): boolean {
    const permissions = this.user?.permissions || this.guestRole?.permissions;
    const isAdmin = permissions?.find(p => p.name === 'admin') != null;
    return isAdmin || this.getPermission(name) != null;
  }

  hasRole(roleId: number): boolean {
    return (
      this.user?.roles?.find(role => role.id === roleId) != null ||
      (!this.user && roleId === getBootstrapData().guest_role?.id)
    );
  }

  checkOverQuotaOrNoPermission(
    permission: string,
    restrictionName: string,
    currentCount: number,
  ) {
    const maxCount = this.getRestrictionValue(permission, restrictionName) as
      | number
      | null;

    let failReason: PolicyFailReason | null = null;
    if (maxCount != null && currentCount >= maxCount) {
      failReason = 'overQuota';
    } else if (!this.hasPermission(permission)) {
      failReason = 'noPermission';
    }

    return failReason;
  }

  getRestrictionValue(
    permissionName: string,
    restrictionName: string,
  ): string | number | boolean | undefined | null {
    const permission = this.getPermission(permissionName);
    let restrictionValue = null;
    if (permission) {
      const restriction = permission.restrictions.find(
        r => r.name === restrictionName,
      );
      restrictionValue = restriction ? restriction.value : undefined;
    }
    return restrictionValue;
  }

  // where to redirect user after successful login
  getRedirectUri(): string {
    const onboarding = getFromLocalStorage<OnboardingState>(
      'be.onboarding.selected',
    );
    if (onboarding) {
      return `/checkout/${onboarding.productId}/${onboarding.priceId}`;
    }
    return getBootstrapData().auth_redirect_uri ?? '/';
  }
}

export const auth = new _Auth();
