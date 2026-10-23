import {auth} from '@common/auth/use-auth';
import {useLocation} from 'react-router';
import {MyPortalLibrary} from './my-portal-library';
import {RecoveryRequest} from './portal-recovery';

export function Component() {
  const location = useLocation();
  const isAuth = auth.isLoggedIn;
  const forceRecovery =
    (location.state as {forceRecovery?: boolean} | null)?.forceRecovery === true;

  if (isAuth && !forceRecovery) {
    return <MyPortalLibrary mode="auth" />;
  }
  if (
    !forceRecovery &&
    (location.pathname.endsWith('/purchases') ||
      location.pathname === '/my-portal' ||
      location.pathname === '/my-portal/')
  ) {
    return <MyPortalLibrary mode="guest" />;
  }
  return <RecoveryRequest />;
}
