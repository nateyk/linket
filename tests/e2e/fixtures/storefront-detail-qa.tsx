// Isolated browser-only test harness: real public React page components,
// synthetic creator data, no real accounts, provider keys or backend calls.
import '@app/app.css';
import type {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {
  PublicDigitalProductPage,
  type DigitalProductPageData,
} from '@app/digital-products/public/digital-product-public-pages';
import {PublicServicePage} from '@app/services/public/public-service-page';
import type {PublicServicePageData} from '@app/services/public/service-types';
import {ColorSchemeContext} from '@common/core/color-scheme-provider';
// This fixture lives outside tsconfig's app include glob; use a relative
// import for the bootstrap store instead of a tsconfig-only @ui alias.
import {setBootstrapData} from '../../../common/foundation/resources/client/ui/library/bootstrap-data/bootstrap-data-store';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router';

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode') ?? 'service';
const long = params.get('long') === '1';
const dark = params.get('theme') === 'dark';
const appearancePreset = params.get('appearance');

document.documentElement.classList.toggle('dark', dark);
document.documentElement.classList.toggle('light', !dark);

setBootstrapData({
  settings: {
    branding: {
      site_name: 'Linket QA',
      logo_light: '',
      logo_dark: '',
      logo_light_mobile: '',
      logo_dark_mobile: '',
    },
    biolink: {},
    billing: {currency: 'ETB', currency_symbol: 'Br'},
    themes: {default_scheme: dark ? 'dark' : 'light'},
  },
  i18n: {
    active: 'en',
    locales: [{language: 'en', name: 'English', lines: {}}],
  },
} as never);

const titleLong =
  'አገልግሎት ዲጂታል ኮርስ — ' + 'BrandIdentityExperience'.repeat(9);
const bodyLong =
  'በጥራት እና በጊዜ እንሰራለን። '.repeat(14) +
  'WhatIsIncludedInTheExtendedPackage'.repeat(7);
// Use actual serialized creator Appearance values. They never come from
// production: these deterministic QA fixtures cover contrasting gradient
// palettes, roundness and button shadows in both public pages and portals.
const appearance: BiolinkAppearanceConfig | null =
  appearancePreset === 'bright-gradient'
    ? ({
        bgConfig: {
          backgroundImage: 'linear-gradient(90deg, #56ab2f, #a8e063)',
          color: '#ffffff',
        },
        btnConfig: {
          radius: 'rounded-lg',
          shadow: 'strong',
          variant: 'outline',
          color: '#193452',
        },
        fontConfig: {family: 'Inter'},
      } as BiolinkAppearanceConfig)
    : appearancePreset === 'dark-gradient'
      ? ({
          bgConfig: {
            backgroundImage: 'linear-gradient(90deg, #29323c, #485563)',
          },
          btnConfig: {
            radius: 'rounded-full',
            shadow: 'soft',
            variant: 'solid',
          },
          fontConfig: {family: 'Oswald'},
        } as BiolinkAppearanceConfig)
      : dark
        ? {bgConfig: {backgroundColor: '#111827', color: '#f8fafc'}}
        : null;

const service: PublicServicePageData = {
  store: {
    id: 7,
    name: 'Linket QA Studio',
    profile_config: {display_name: 'Linket QA Studio'},
  } as PublicServicePageData['store'],
  appearance,
  service: {
    id: 16,
    slug: 'brand-design',
    title: long ? titleLong : 'Brand identity and logo design',
    short_description: long
      ? bodyLong
      : 'Thoughtful visual identities, artwork and clear deliverables.',
    category: 'Design & Branding',
    skills: ['Brand strategy', 'Logo design', 'Visual guidelines'],
    cover: null,
    gallery: [],
    packages_count: 3,
    starting_price_cents: 29900,
    currency: 'ETB',
    public_url: '/mock/service',
    description: '<p>Custom identity design with clear deliverables.</p>',
    contact_channels: [
      {type: 'whatsapp', label: 'WhatsApp', value: '+251911234567'},
      {type: 'whatsapp', label: 'WhatsApp', value: '+251911234567'},
      {type: 'email', label: 'Email', value: 'creator@example.test'},
    ],
    packages: [
      {
        id: 11,
        name: long ? 'StarterPackage'.repeat(13) : 'Starter',
        description: long ? bodyLong : 'One concept and essential export files.',
        price_cents: 29900,
        currency: 'ETB',
        delivery_days: 7,
        revisions: 2,
        features: ['Logo concept', 'Export files'],
      },
      {
        id: 12,
        name: long ? 'PremiumIdentityPackage'.repeat(7) : 'Premium',
        description: 'Multi-concept branding.',
        price_cents: 59900,
        currency: 'ETB',
        delivery_days: 5,
        revisions: 5,
        features: ['Identity guide', 'Brand assets'],
      },
      {
        id: 13,
        name: long ? 'EnterpriseExpansion'.repeat(8) : 'Custom',
        description: bodyLong,
        price_cents: null,
        currency: 'ETB',
        delivery_days: null,
        revisions: null,
        features: [long ? bodyLong : 'Tailored project'],
      },
    ],
    faqs: [
      {
        id: 20,
        question: long
          ? 'WhatDoesTheExtendedAgreementInclude'.repeat(5)
          : 'What will I receive?',
        answer: long ? bodyLong : 'The final design files and agreed assets.',
      },
    ],
  },
  inquiry_endpoint: '/api/v1/mock/service-inquiry',
  back_url: '/tests/e2e/fixtures/storefront-detail-qa.html?mode=service',
};

const course = mode === 'course';
const paid = mode === 'paid';
const unavailable = mode === 'unavailable';
const product: DigitalProductPageData = {
  biolink: {
    id: 7,
    name: 'Linket QA Studio',
    profile_config: {display_name: 'Linket QA Studio'},
  },
  creator: {name: 'Linket QA Studio'},
  appearance,
  product: {
    id: 19,
    title: long
      ? titleLong
      : course
        ? 'Design foundations: the complete course'
        : 'Digital design guide',
    description: long
      ? bodyLong
      : 'A practical learning resource with clear steps and examples.',
    learning_outcomes: [
      long ? bodyLong : 'Create better content',
      'Build a reusable workflow',
    ],
    currency: 'ETB',
    price_cents: paid ? 29000 : 0,
    payment_mode: unavailable ? 'unavailable' : paid ? 'direct' : 'free',
    can_buy: !unavailable,
    is_course: course,
    type: course ? 'course' : 'digital',
    course_id: course ? 19 : null,
    chapters_count: course ? 3 : null,
    lessons_count: course ? 6 : null,
    files_count: course ? 0 : 1,
    cover: null,
    samples: [],
  },
  checkout_endpoint: '/api/v1/mock/checkout',
  reviews_enabled: false,
  back_url: '/tests/e2e/fixtures/storefront-detail-qa.html?mode=free',
};

createRoot(document.getElementById('root')!).render(
  <ColorSchemeContext.Provider
    value={{
      colorScheme: dark ? 'dark' : 'light',
      setColorScheme: () => undefined,
    }}
  >
    <BrowserRouter>
      {mode === 'service' ? (
        <PublicServicePage data={service} />
      ) : (
        <PublicDigitalProductPage data={product} />
      )}
    </BrowserRouter>
  </ColorSchemeContext.Provider>,
);
