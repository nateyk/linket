import {appRouter} from '@app/app-router';
import {Biolink} from '@app/gen/schemas/biolink';
import {CustomPage} from '@app/gen/schemas/custom-page';
import {Folder} from '@app/gen/schemas/folder';
import {Link as LinkType} from '@app/gen/schemas/link';
import {ListProducts200} from '@app/gen/schemas/list-products200';
import {LandingPageContent} from '@app/landing/landing-page-content';
import type {
  DigitalProductOrderSuccessPageData,
  DigitalProductPageData,
} from '@app/digital-products/public/digital-product-public-pages';
import {BaseBackendBootstrapData} from '@common/core/base-backend-bootstrap-data';
import {CommonProvider} from '@common/core/common-provider';
import {BaseBackendSettings} from '@common/core/settings/base-backend-settings';
import {ignoredSentryErrors} from '@common/http/errors/ignored-sentry-errors';
import {SectionConfig} from '@common/ui/landing-page/landing-page-config';
import * as Sentry from '@sentry/react';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {rootEl} from '@ui/root-el';
import {PartialRecord} from '@ui/utils/ts/partial-record';
import {createRoot, RootOptions} from 'react-dom/client';
import './app.css';

declare module '@ui/bootstrap-data/bootstrap-data' {
  interface BootstrapData extends BaseBackendBootstrapData {
    biolinks: Biolink[];
    loaders?: {
      landingPage?: {
        products: ListProducts200;
        sections?: SectionConfig[];
        stats: {
          links: number;
          qrCodes: number;
          clicks: number;
          users: number;
        };
      };
      customPage?: {data: CustomPage};
      linkeablePage?: {
        data: LinkType | Folder | Biolink;
      };
      digitalProductPage?: {
        data: DigitalProductPageData;
      };
      digitalProductOrderSuccessPage?: {
        data: DigitalProductOrderSuccessPageData;
      };
    };
  }
}

declare module '@ui/settings/settings' {
  interface Settings extends BaseBackendSettings {
    unsplash_is_setup?: boolean;
    homepage: {
      appearance: LandingPageContent;
      type: 'loginPage' | 'registerPage' | string;
      value?: string;
    };
    dashboard?: {
      homepage?: string;
    };
    links?: {
      gchart_api_key?: string;
      back_half_min?: number;
      back_half_max?: number;
      back_half_content?: string;
      redirect_time?: number;
      enable_type?: boolean;
      default_type?: LinkType['type'];
      min_len?: number;
      max_len?: number;
      retargeting?: boolean;
      pixels?: boolean;
      dash_footer?: boolean;
      homepage_stats?: boolean;
      homepage_pricing?: boolean;
      blacklist?: {
        domains?: string[];
        keywords?: string[];
      };
      phishtank_key?: string;
      subdomain_matching?: boolean;
    };
    biolink: {
      show_branding?: boolean;
      branding_img?: string;
    };
    ads?: {
      biolink_top?: string;
      splash_top?: string;
      splash_bottom?: string;
      dashboard?: string;
      frame?: string;
      landing?: string;
      link_page?: string;
      disable?: boolean;
    };
    captcha?: BaseBackendSettings['captcha'] & {
      enable?: PartialRecord<
        'landing_new_link' | 'register' | 'contact',
        boolean
      >;
    };
  }
}

const data = getBootstrapData();
let options: RootOptions | undefined = undefined;
const sentryDsn = data.settings.logging.sentry_public;
if (sentryDsn && import.meta.env.PROD) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.2,
    ignoreErrors: ignoredSentryErrors,
    release: data.sentry_release,
  });

  options = {
    onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
      console.warn('Uncaught error', error, errorInfo.componentStack);
    }),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  };
}

const app = <CommonProvider router={appRouter} />;

createRoot(rootEl, options).render(app);
