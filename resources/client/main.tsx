import {appRouter} from '@app/app-router';
import {Biolink} from '@app/gen/schemas/biolink';
import type {Biolink as Store} from '@app/gen/schemas/biolink';
import {CustomPage} from '@app/gen/schemas/custom-page';
import {Folder} from '@app/gen/schemas/folder';
import {Link as LinkType} from '@app/gen/schemas/link';
import {ListProducts200} from '@app/gen/schemas/list-products200';
import {LandingPageContent} from '@app/landing/landing-page-content';
import type {
  DigitalProductOrderSuccessPageData,
  DigitalProductPageData,
} from '@app/digital-products/public/digital-product-public-pages';
import type {HcLandingPageData} from '@app/help-center/homepage/hc-landing-page-data';
import type {CategoryPageData} from '@app/help-center/categories/category-page-data';
import type {ArticlePageData} from '@app/help-center/articles/article-page/article-page-data';
import type {UpdateArticlePageData} from '@app/help-center/articles/article-editor/update-article-page-data';
import type {SearchArticlesResponse} from '@app/help-center/search/search-articles-response';
import type {PublicServicePageData} from '@app/services/public/service-types';
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
    stores: Store[];
    biolinks?: Store[];
    /**
     * Canonical creator-sellable product file formats, served from
     * App\Storefront\ProductFileFormats. Optional so older cached pages
     * keep working; consumers must fall back to uploading_types.
     */
    product_file_formats?: Record<
      'digital' | 'ebook' | 'audio' | 'course',
      {extensions: string[]; accept: string; hint: string}
    >;
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
      servicePage?: {
        data: PublicServicePageData;
      };
      hcLandingPage?: HcLandingPageData;
      categoryPage?: CategoryPageData;
      articlePage?: ArticlePageData;
      updateArticle?: UpdateArticlePageData;
      searchArticles?: SearchArticlesResponse;
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
    store: {
      show_branding?: boolean;
      branding_img?: string;
    };
    kyc?: {
      enabled?: boolean;
      selfie_verification?: boolean;
    };
    storefront?: {
      reviews_enabled?: boolean;
    };
    modules?: Record<
      'ai' | 'envato' | 'livechat',
      {installed?: boolean; setup?: boolean}
    >;
    websockets_setup?: boolean;
    // Help center + support surfaces (BeDesk-native).
    hcLanding?: Record<string, any>;
    hc?: Record<string, any>;
    articles?: Record<string, any>;
    article?: {hide_new_ticket_link?: boolean; [key: string]: any};
    tickets?: Record<string, any>;
    chatPage?: Record<string, any>;
    // Optional LiveChat / AI addons.
    chatWidget?: Record<string, any>;
    lc?: Record<string, any>;
    aiAgent?: Record<string, any>;
    envato?: Record<string, any>;
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
        'landing_new_link' | 'register' | 'contact' | 'new_ticket',
        boolean
      >;
    };
  }
}

const data = getBootstrapData();
// canonical stores, keep deprecated biolinks alias for compat
(data as unknown as {stores?: Store[]; biolinks?: Store[]}).stores =
  (data as unknown as {stores?: Store[]; biolinks?: Store[]}).biolinks ??
  (data as unknown as {stores?: Store[]}).stores;
(data as unknown as {biolinks?: Store[]}).biolinks = (
  data as unknown as {stores: Store[]}
).stores;
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
