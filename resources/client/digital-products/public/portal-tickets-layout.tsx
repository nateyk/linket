import {auth} from '@common/auth/use-auth';
import {Outlet, useNavigate} from 'react-router';
import {PortalLibraryLayout} from './portal-library-layout';
import {PortalSidebar} from './my-portal-sidebar';
import {PORTAL_EMAIL_KEY} from './portal-order-types';
import type {PortalSection} from './portal-section';

function readPortalEmail(): string | undefined {
  try {
    return sessionStorage.getItem(PORTAL_EMAIL_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Buyer portal chrome around the shared customer tickets pages. */
export function Component() {
  const navigate = useNavigate();
  const email = readPortalEmail() || auth.user?.email || undefined;

  const onSectionChange = (section: PortalSection) => {
    if (section === 'overview') {
      navigate('/my-portal');
      return;
    }
    navigate(`/my-portal?section=${section}`);
  };

  return (
    <PortalLibraryLayout>
      <PortalSidebar
        mode={auth.isLoggedIn ? 'auth' : 'guest'}
        email={email}
        activeSection="overview"
        onSectionChange={onSectionChange}
      />
      <Outlet />
    </PortalLibraryLayout>
  );
}
