import {message} from '@ui/i18n/message';
import type {MessageDescriptor} from '@ui/i18n/message-descriptor';
import type {LucideIcon} from 'lucide-react';
import {
  BarChart3Icon,
  BookOpenIcon,
  CompassIcon,
  CreditCardIcon,
  LayersIcon,
  LifeBuoyIcon,
  MessageSquareIcon,
  NewspaperIcon,
  SparklesIcon,
  StoreIcon,
} from 'lucide-react';

export type HeaderSectionInput = {
  name: string;
  title?: string;
  badge?: string;
  presentation?: string;
  mediaVariant?: string;
};

export type HeaderSubItem = {
  id: string;
  label: MessageDescriptor;
  description?: MessageDescriptor;
  href: string;
  icon: LucideIcon;
  isRoute?: boolean;
};

export type HeaderNavGroup = {
  id: string;
  label: MessageDescriptor;
  href?: string;
  isRoute?: boolean;
  columns?: 1 | 2;
  items?: HeaderSubItem[];
};

const DEFAULT_ANCHORS = {
  storefront: '/#not-just-a-bio-page-your-own-corner-of-the-internet',
  catalog: '/#sell-more-than-just-downloads',
  checkout: '/#a-clearer-path-from-checkout-to-confirmed-orders',
  tools: '/#everything-you-need-to-create-and-grow',
  journey: '/#from-your-first-idea-to-your-first-sale',
  stories: '/#real-creators-real-storefronts',
} as const;

function findAnchor(
  sections: HeaderSectionInput[],
  anchors: (string | undefined)[],
  predicate: (section: HeaderSectionInput) => boolean,
): {href: string; index: number} | null {
  const index = sections.findIndex(
    (section, idx) => Boolean(anchors[idx]) && predicate(section),
  );
  if (index === -1 || !anchors[index]) {
    return null;
  }
  return {href: `#${anchors[index]}`, index};
}

export function buildHeaderNavItems(
  sections: HeaderSectionInput[] = [],
  anchors: (string | undefined)[] = [],
): HeaderNavGroup[] {
  const hasSections = sections.length > 0;
  const matchedIndices = new Set<number>();

  const pickHref = (
    predicate: (section: HeaderSectionInput) => boolean,
    fallback: string,
  ) => {
    if (!hasSections) return fallback;
    const match = findAnchor(sections, anchors, predicate);
    if (match) {
      matchedIndices.add(match.index);
      return match.href;
    }
    return fallback;
  };

  const storefrontHref = pickHref(
    s =>
      s.name === 'feature-with-screenshot' &&
      (s.mediaVariant === 'browser' ||
        Boolean(s.title?.toLowerCase().includes('storefront')) ||
        Boolean(s.title?.toLowerCase().includes('bio page'))),
    DEFAULT_ANCHORS.storefront,
  );
  const catalogHref = pickHref(
    s => s.name === 'features-grid' && s.presentation === 'catalog',
    DEFAULT_ANCHORS.catalog,
  );
  const checkoutHref = pickHref(
    s =>
      s.name === 'feature-with-screenshot' &&
      (s.mediaVariant === 'checkout' ||
        Boolean(s.title?.toLowerCase().includes('checkout'))),
    DEFAULT_ANCHORS.checkout,
  );
  const toolsHref = pickHref(
    s =>
      s.name === 'features-grid' &&
      s.presentation !== 'journey' &&
      s.presentation !== 'catalog',
    DEFAULT_ANCHORS.tools,
  );
  const journeyHref = pickHref(
    s => s.name === 'features-grid' && s.presentation === 'journey',
    DEFAULT_ANCHORS.journey,
  );
  const storiesHref = pickHref(
    s => s.name === 'creator-stories',
    DEFAULT_ANCHORS.stories,
  );

  const productItems: HeaderSubItem[] = [
    {
      id: 'storefront-builder',
      label: message('Storefront Builder'),
      description: message(
        'Design your link-in-bio page and showcase everything you make.',
      ),
      href: storefrontHref,
      icon: StoreIcon,
    },
    {
      id: 'digital-products-courses',
      label: message('Digital Products & Courses'),
      description: message(
        'Sell ebooks, downloads, templates, courses, and creator services.',
      ),
      href: catalogHref,
      icon: BookOpenIcon,
    },
    {
      id: 'chapa-checkout-payouts',
      label: message('Chapa Checkout & Payouts'),
      description: message(
        'Accept verified Chapa payments and follow creator withdrawals.',
      ),
      href: checkoutHref,
      icon: CreditCardIcon,
    },
    {
      id: 'links-qr-insights',
      label: message('Links, QR & Insights'),
      description: message(
        'Share short links and QR codes while tracking audience engagement.',
      ),
      href: toolsHref,
      icon: BarChart3Icon,
    },
  ];

  // Preserve any extra admin-configured feature sections not covered by the core 4 cards.
  sections.forEach((section, index) => {
    if (matchedIndices.has(index) || !anchors[index]) return;
    if (
      !section.name.startsWith('feature-') &&
      section.name !== 'features-grid'
    ) {
      return;
    }
    const labelText = section.title || section.badge || 'Feature';
    productItems.push({
      id: `section-${index}-${anchors[index]}`,
      label: message(labelText),
      href: `#${anchors[index]}`,
      icon: LayersIcon,
    });
  });

  const resourceItems: HeaderSubItem[] = [
    {
      id: 'how-it-works',
      label: message('How It Works'),
      description: message(
        'Go from your first idea to your first confirmed sale.',
      ),
      href: journeyHref,
      icon: CompassIcon,
    },
    {
      id: 'creator-stories',
      label: message('Creator Stories'),
      description: message('Explore real storefronts published on Linket.'),
      href: storiesHref,
      icon: SparklesIcon,
    },
    {
      id: 'help-center',
      label: message('Help Center'),
      description: message(
        'Setup guides, answers, and support for your storefront.',
      ),
      href: '/hc',
      icon: LifeBuoyIcon,
      isRoute: true,
    },
    {
      id: 'blog',
      label: message('Blog'),
      description: message('Product updates and creator growth guides.'),
      href: '/blog',
      icon: NewspaperIcon,
      isRoute: true,
    },
    {
      id: 'contact',
      label: message('Contact Us'),
      description: message('Reach our team with questions about Linket.'),
      href: '/contact',
      icon: MessageSquareIcon,
      isRoute: true,
    },
  ];

  const pricingOnLanding = sections.some(s => s.name === 'pricing');

  return [
    {
      id: 'product',
      label: message('Product'),
      columns: 2,
      items: productItems,
    },
    {
      id: 'resources',
      label: message('Resources'),
      columns: 1,
      items: resourceItems,
    },
    {
      id: 'pricing',
      label: message('Pricing'),
      href: pricingOnLanding ? '#pricing-section' : '/pricing',
      isRoute: !pricingOnLanding,
    },
    {
      id: 'contact',
      label: message('Contact'),
      href: '/contact',
      isRoute: true,
    },
  ];
}
