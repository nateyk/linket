import {SiteConfig} from '@app/site-config';
import {SettingsPreviewListener} from '@common/admin/settings/preview/settings-preview-listener';
import {auth, useAuth} from '@common/auth/use-auth';
import {ColorSchemeProvider} from '@common/core/color-scheme-provider';
import {BaseSiteConfig} from '@common/core/settings/base-site-config';
import {SiteConfigContext} from '@common/core/settings/site-config-context';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {PageErrorMessage} from '@common/http/errors/page-error-message';
import {apiErrorStatusIs} from '@common/http/errors/parsed-api-error';
import {queryClient} from '@common/http/query-client';
import {CookieNotice} from '@common/ui/cookie-notice/cookie-notice';
import {NotFoundPage} from '@common/ui/not-found-page/not-found-page';
import {Toaster} from '@shadcn/toast/toast';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {QueryClientProvider} from '@tanstack/react-query';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {DialogStoreOutlet} from '@ui/overlays/store/dialog-store-outlet';
import {TopProgressBar} from '@ui/progress/top-progress-bar';
import {ToastContainer} from '@ui/toast/toast-container';
import deepMerge from 'deepmerge';
import {domAnimation, LazyMotion} from 'framer-motion';
import {NuqsAdapter} from 'nuqs/adapters/react-router/v7';
import {Fragment, useEffect, useState} from 'react';
import {
  createBrowserRouter,
  MiddlewareFunction,
  Navigate,
  Outlet,
  redirect,
  RouterProvider,
  ScrollRestoration,
  useNavigation,
  useRouteError,
} from 'react-router';

const mergedConfig = deepMerge(BaseSiteConfig, SiteConfig);

type Router = ReturnType<typeof createBrowserRouter>;

interface Props {
  router: Router;
}
export function CommonProvider({router}: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation}>
        <SiteConfigContext.Provider value={mergedConfig}>
          <ColorSchemeProvider>
            <Tooltip.Provider>
              <NuqsAdapter>
                <RouterProvider router={router} useTransitions />
              </NuqsAdapter>
            </Tooltip.Provider>
          </ColorSchemeProvider>
        </SiteConfigContext.Provider>
      </LazyMotion>
    </QueryClientProvider>
  );
}

export function RootRoute() {
  return (
    <Fragment>
      <GlobalTopLoadingBar />
      <Outlet />
      <SettingsPreviewListener />
      <CookieNotice />
      <ToastContainer />
      <Toaster />
      <DialogStoreOutlet />
      <ScrollRestoration />
    </Fragment>
  );
}

export function RootErrorElement() {
  const [bar] = useState(() => new TopProgressBar());
  const {isLoggedIn} = useAuth();
  const error = useRouteError();

  // hide loading bar on error page
  useEffect(() => {
    bar.hide();
  }, [bar]);

  console.log(error);

  if (apiErrorStatusIs(error, 404)) {
    return <NotFoundPage />;
  }

  if (
    (apiErrorStatusIs(error, 401) || apiErrorStatusIs(error, 403)) &&
    !isLoggedIn
  ) {
    return <Navigate to="/login" replace />;
  }

  return <PageErrorMessage />;
}

export const rootRouteMiddleware: MiddlewareFunction[] = [
  ({pattern}) => {
    if (
      pattern !== '/verify-email' &&
      auth.user &&
      getBootstrapData().settings?.require_email_confirmation &&
      !auth.user?.email_verified_at
    ) {
      throw redirect('/verify-email');
    }

    if (pattern !== '/suspended' && auth.user?.banned_at) {
      throw redirect('/suspended');
    }
  },
];

export function GlobalTopLoadingBar() {
  const {state} = useNavigation();

  // only start showing loader after 50ms, this will prevent it from showing on most js chunk fetches
  useShowGlobalLoadingBar({isLoading: state === 'loading', delay: 80});

  return null;
}
