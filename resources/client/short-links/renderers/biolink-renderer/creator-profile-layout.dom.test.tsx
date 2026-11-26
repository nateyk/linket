/**
 * @vitest-environment jsdom
 */
import {render, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {
  computeVisibleSkillCount,
  CreatorProfileLayout,
} from './creator-profile-layout';

/**
 * On a phone the profile shows one section at a time and the floating bottom
 * nav is the only way to move between them: the Products | About tab strip is
 * the desktop arrangement, where both live side by side.
 *
 * The split is expressed as container-query classes, which resolve against a
 * real container rather than the window, so these tests drive the rendered
 * component and assert on what a person would see and click.
 */

vi.mock('@ui/settings/use-settings', () => ({
  useSettings: () => ({
    branding: {site_name: 'Linket', logo_dark: '/logo.svg', logo_light: ''},
    biolink: {branding_img: ''},
  }),
}));

vi.mock('@ui/themes/use-is-dark-mode', () => ({
  useIsDarkMode: () => false,
}));

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <span>{message}</span>,
}));

vi.mock('@ui/i18n/use-trans', () => ({
  useTrans: () => ({trans: (m: {message?: string} | string) =>
    typeof m === 'string' ? m : (m.message ?? '')}),
}));

vi.mock('react-router', () => ({
  Link: ({children, ...rest}: {children: React.ReactNode}) => (
    <a {...rest}>{children}</a>
  ),
}));

vi.mock('@app/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-renderer', () => ({
  ShopWidgetRenderer: ({showHeading}: {showHeading?: boolean}) => (
    <div data-testid="shop-widget">
      {showHeading !== false && <h2>Products</h2>}
      <p>Digital product one</p>
      <p>Digital product two</p>
    </div>
  ),
}));

vi.mock('@common/http/query-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({data: {data: []}}),
  },
}));

// The shop card and the tab strip live in StoreFront; a marker is enough to
// tell whether the mobile branch rendered either.
vi.mock('./store-front', () => ({
  StoreFront: () => (
    <div data-testid="storefront">
      <div role="tablist">
        <span>Products</span>
        <span>About</span>
      </div>
    </div>
  ),
}));

const ABOUT_HTML = '<p>About this creator</p>';

function makeBiolink(overrides: Record<string, unknown> = {}) {
  return {
    ...overrides,
    id: 1,
    builder_mode: 'creator_profile',
    public_item_count: 2,
    profile_config: {
      display_name: 'Nathanael',
      profile_title: 'Creative director',
      bio: 'Designs things.',
      about_html: ABOUT_HTML,
      avatar_url: '',
      cover_url: '',
      available_for_work: true,
      skills: ['Design', 'Photography'],
      contact_url: 'mailto:hi@example.com',
      social_links: {x: 'someone'},
    },
  } as never;
}

const shopWidget = {
  id: 9,
  model_type: 'biolinkWidget',
  type: 'shop',
  active: true,
  config: {product_ids: [1, 2]},
} as never;

function renderProfile() {
  return render(
    <CreatorProfileLayout
      biolink={makeBiolink()}
      appearance={null}
      content={[shopWidget]}
    />,
  );
}

/**
 * The mobile branch. jsdom loads no stylesheet, so `@4xl:hidden` and
 * `hidden @4xl:grid` never resolve and both arrangements stay in the DOM —
 * which is exactly the ambiguity these tests must not fall into. Scoping to
 * this container is also what a phone shows: the mobile layout, one section at
 * a time. The desktop grid is covered separately.
 */
/** Finds a branch by the Tailwind classes that identify it, not a selector. */
function branch(mobile: boolean): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('div')].find(el =>
    mobile
      ? el.classList.contains('@4xl:hidden')
      : el.classList.contains('@4xl:grid'),
  );
  expect(found, `${mobile ? 'mobile' : 'desktop'} branch should exist`).toBeTruthy();
  return found!;
}

function mobileBranch(): HTMLElement {
  return branch(true);
}

function desktopBranch(): HTMLElement {
  return branch(false);
}

/** The bottom nav, found by its accessible name inside the mobile branch. */
function bottomNav() {
  return within(mobileBranch()).getByRole('navigation');
}

function navButton(name: string) {
  return within(bottomNav()).getByRole('button', {name});
}

/**
 * A rendered section. Scoped to <section aria-label> so the nav buttons, which
 * carry the same labels, are never mistaken for one.
 */
function section(name: string): HTMLElement | null {
  return (
    [...mobileBranch().querySelectorAll<HTMLElement>('section[aria-label]')].find(
      el => el.getAttribute('aria-label') === name,
    ) ?? null
  );
}

beforeEach(() => {
  // The layout resets scroll on a section switch.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('addressing a storefront section from the URL', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/');
  });

  test('opens Services when the link names that section', () => {
    window.history.replaceState({}, '', '/natee?section=services');

    // The store also has products, so without the parameter the page would
    // open on Products — which is what a "back to profile" link used to do.
    render(
      <CreatorProfileLayout
        biolink={makeBiolink({public_service_count: 1})}
        appearance={null}
        content={[shopWidget]}
      />,
    );

    expect(navButton('Services').getAttribute('aria-pressed')).toBe('true');
    expect(section('Services')).toBeTruthy();
    expect(section('Products')).toBeNull();
  });

  test('ignores a section that does not exist', () => {
    window.history.replaceState({}, '', '/natee?section=services');

    // This store has no services, so the parameter must not strand the
    // visitor on an empty section.
    renderProfile();

    expect(section('Products')).toBeTruthy();
    expect(section('Services')).toBeNull();
  });
});

describe('creator profile on mobile', () => {
  test('(a) Products is the default home when the shop has items', () => {
    renderProfile();

    // Bio page IS the store — match desktop defaultTab="products".
    expect(section('Products')).toBeTruthy();
    expect(within(mobileBranch()).getByTestId('shop-widget')).toBeTruthy();
    // The Products | About strip belongs to the desktop grid.
    expect(within(mobileBranch()).queryByTestId('storefront')).toBeNull();
    expect(section('Profile')).toBeNull();
    expect(section('About')).toBeNull();
  });

  test('Products has a compact sticky title, no count, and the original bottom nav', () => {
    renderProfile();

    const title = within(section('Products')!).getByRole('heading', {
      name: 'Products',
      level: 2,
    });
    const header = title.closest('[data-testid="mobile-catalog-heading"]');
    expect(header).toBeTruthy();
    expect(header!.className).toContain('sticky');
    expect(header!.className).toContain('top-[var(--safe-top');
    expect(title.className).toContain('text-sm');
    expect(within(section('Products')!).queryByText(/items? for sale/)).toBeNull();
    expect(within(section('Products')!).getAllByRole('heading', {name: 'Products'})).toHaveLength(1);

    const nav = bottomNav();
    expect(nav.className).toContain('fixed');
    expect(nav.className).toContain('bottom-[max(1rem,var(--safe-bottom');
    expect(within(mobileBranch()).queryByTestId('mobile-storefront-section-nav')).toBeNull();
  });

  test('Services gets the same compact sticky title, without a duplicate heading', async () => {
    const user = userEvent.setup();
    render(
      <CreatorProfileLayout
        biolink={makeBiolink({public_service_count: 1})}
        appearance={null}
        content={[shopWidget]}
      />,
    );

    await user.click(navButton('Services'));
    const services = section('Services')!;
    const title = within(services).getByRole('heading', {
      name: 'Services',
      level: 2,
    });
    expect(title.closest('[data-testid="mobile-catalog-heading"]')).toBeTruthy();
    expect(within(services).getAllByRole('heading', {name: 'Services'})).toHaveLength(1);
    expect(navButton('Services').getAttribute('aria-pressed')).toBe('true');
    expect(within(services).queryByText(/items? for sale/)).toBeNull();
  });

  test('(b) tapping Profile shows only the card', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(navButton('Profile'));

    expect(section('Profile')).toBeTruthy();
    expect(within(section('Profile')!).queryByTestId('mobile-catalog-heading')).toBeNull();
    expect(within(section('Profile')!).getByText('Nathanael')).toBeTruthy();
    expect(
      within(section('Profile')!).getByText('Creative director'),
    ).toBeTruthy();
    expect(section('Products')).toBeNull();
    expect(section('About')).toBeNull();
    expect(within(mobileBranch()).queryByTestId('storefront')).toBeNull();
  });

  test('(c) tapping About shows only the About content', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(navButton('About'));

    expect(section('About')).toBeTruthy();
    expect(within(mobileBranch()).getByText('About this creator')).toBeTruthy();
    expect(section('Profile')).toBeNull();
    expect(section('Products')).toBeNull();
    expect(within(mobileBranch()).queryByTestId('storefront')).toBeNull();
  });

  test('(d) Services appears when the creator has published services', async () => {
    const user = userEvent.setup();
    render(
      <CreatorProfileLayout
        biolink={makeBiolink({public_service_count: 1})}
        appearance={null}
        content={[shopWidget]}
      />,
    );

    expect(navButton('Services')).toBeTruthy();
    await user.click(navButton('Services'));

    expect(section('Services')).toBeTruthy();
    expect(
      await within(section('Services')!).findByText('No services yet'),
    ).toBeTruthy();
    expect(section('Products')).toBeNull();
  });

  test('the nav is the only way between sections, and marks the current one', async () => {
    const user = userEvent.setup();
    renderProfile();

    // A nav, not a tablist: buttons with aria-pressed, never tabs without
    // tabpanels.
    expect(within(mobileBranch()).queryByRole('tablist')).toBeNull();
    expect(navButton('Products').getAttribute('aria-pressed')).toBe('true');
    expect(navButton('Profile').getAttribute('aria-pressed')).toBe('false');

    await user.click(navButton('About'));

    expect(navButton('About').getAttribute('aria-pressed')).toBe('true');
    expect(navButton('Products').getAttribute('aria-pressed')).toBe('false');
  });

  test('(d) switching resets the scroll to the top', async () => {
    const user = userEvent.setup();
    renderProfile();
    (window.scrollTo as ReturnType<typeof vi.fn>).mockClear();

    await user.click(navButton('Profile'));
    expect(window.scrollTo).toHaveBeenCalledWith({top: 0});

    (window.scrollTo as ReturnType<typeof vi.fn>).mockClear();
    await user.click(navButton('About'));
    expect(window.scrollTo).toHaveBeenCalledWith({top: 0});
  });

  test('the nav sits above the home indicator, on the device inset', () => {
    renderProfile();
    // The bar parks on --safe-bottom (34px on the device), which is what
    // keeps it clear of the indicator; the layout reserves that inset too.
    const nav = bottomNav();
    expect(nav.className).toContain('bottom-[max(1rem,var(--safe-bottom,env(safe-area-inset-bottom,0px)))]');
    expect(nav.className).toContain('fixed');
    const main = mobileBranch().closest('main')!;
    expect(main.className).toContain('var(--safe-bottom');
    expect(main.className).toContain('var(--safe-top');
  });

  test('a profile with neither products nor about gets no nav', () => {
    render(
      <CreatorProfileLayout
        biolink={
          {
            ...(makeBiolink() as object),
            public_item_count: 0,
            profile_config: {about_html: ''},
          } as never
        }
        appearance={null}
        content={[]}
      />,
    );

    expect(within(mobileBranch()).queryByRole('navigation')).toBeNull();
    expect(section('Profile')).toBeTruthy();
  });

  test('the desktop grid keeps both sections side by side', () => {
    renderProfile();
    const desktop = desktopBranch();

    // Above @4xl the storefront tab strip returns: on a wide screen both live
    // at once, so the strip is the right control there.
    expect(within(desktop).getByTestId('storefront')).toBeTruthy();
    expect(within(desktop).getByText('Nathanael')).toBeTruthy();
    // The bottom nav is a phone affordance and stays out of the grid.
    expect(within(desktop).queryByRole('navigation')).toBeNull();
  });

  test('only the sections that exist appear in the nav', () => {
    // Products but no About.
    render(
      <CreatorProfileLayout
        biolink={
          {
            ...(makeBiolink() as object),
            profile_config: {about_html: ''},
          } as never
        }
        appearance={null}
        content={[shopWidget]}
      />,
    );

    expect(within(bottomNav()).getByRole('button', {name: 'Profile'})).toBeTruthy();
    expect(within(bottomNav()).getByRole('button', {name: 'Products'})).toBeTruthy();
    expect(within(bottomNav()).queryByRole('button', {name: 'About'})).toBeNull();
  });
});

describe('the preview follows the editor tab (A-06)', () => {
  function renderWithSection(
    previewSection?: 'profile' | 'products' | 'about',
  ) {
    return render(
      <CreatorProfileLayout
        biolink={makeBiolink()}
        appearance={null}
        content={[shopWidget]}
        previewSection={previewSection}
      />,
    );
  }

  test('an editor-driven section switches the nav and resets the scroll', () => {
    renderWithSection('about');

    expect(section('About')).toBeTruthy();
    expect(section('Profile')).toBeNull();
    // Same code path as the nav buttons: instant scroll (no smooth
    // animation, so prefers-reduced-motion is honored by construction).
    expect(window.scrollTo).toHaveBeenCalledWith({top: 0});
  });

  test('the public page (no previewSection) is untouched', () => {
    renderWithSection(undefined);

    // Public load with a shop opens Products; About stays off until tapped.
    expect(section('Products')).toBeTruthy();
    expect(section('About')).toBeNull();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  test('a manual tap is kept until the editor itself moves', async () => {
    const user = userEvent.setup();
    const {rerender} = renderWithSection('profile');

    await user.click(navButton('About'));
    expect(section('About')).toBeTruthy();

    // Same editor tab, re-posted: the preview keeps the manual choice.
    rerender(
      <CreatorProfileLayout
        biolink={makeBiolink()}
        appearance={null}
        content={[shopWidget]}
        previewSection="profile"
      />,
    );
    expect(section('About')).toBeTruthy();

    // The editor moves to its About tab: the preview follows.
    rerender(
      <CreatorProfileLayout
        biolink={makeBiolink()}
        appearance={null}
        content={[shopWidget]}
        previewSection="about"
      />,
    );
    expect(section('About')).toBeTruthy();

    // Back to a Profile-section tab: the preview follows again.
    rerender(
      <CreatorProfileLayout
        biolink={makeBiolink()}
        appearance={null}
        content={[shopWidget]}
        previewSection="profile"
      />,
    );
    expect(section('Profile')).toBeTruthy();
    expect(section('About')).toBeNull();
  });
});


describe('creator profile cover and verification polish', () => {
  test('uses the editor 3:1 crop and anchors the legible verified badge to the avatar', () => {
    const biolink = makeBiolink({is_verified: true}) as unknown as {
      profile_config: Record<string, unknown>;
    };
    biolink.profile_config.cover_url = '/creator-cover.webp';
    biolink.profile_config.avatar_url = '/creator-avatar.webp';

    render(
      <CreatorProfileLayout
        biolink={biolink as never}
        appearance={null}
        content={[]}
      />,
    );

    const mobile = mobileBranch();
    const cover = mobile.querySelector<HTMLImageElement>(
      'img[src="/creator-cover.webp"]',
    );
    expect(cover).toBeTruthy();
    expect(cover!.parentElement!.className).toContain('aspect-[3/1]');
    expect(cover!.parentElement!.className).toContain('overflow-hidden');
    expect(cover!.parentElement!.className).toContain('rounded-t-[inherit]');
    // Media-backed cards drop the card root backdrop/fill behind the cover so white anti-aliasing never bleeds against a hard shadow edge.
    const card = cover!.closest('[data-slot="card"]')!;
    expect(card.className).toContain('ring-0');
    expect(card.className).toContain('bg-transparent');
    expect(card.className).toContain('backdrop-blur-none');
    const cardBody = card.querySelector('[data-slot="card-content"]');
    expect(cardBody?.className).toContain('border-x');
    expect(cardBody?.className).toContain('border-b');
    expect(cardBody?.className).toContain('rounded-b-[inherit]');
    expect(cardBody?.className).toContain('bg-[var(--biolink-surface)]');
    expect(cardBody?.className).toContain('backdrop-blur-xl');
    expect(cardBody?.className).toContain('backdrop-saturate-150');
    expect(cover!.className).toContain('absolute');
    expect(cover!.className).toContain('-inset-px');
    expect(cover!.className).toContain('size-[calc(100%_+_2px)]');
    expect(cover!.className).toContain('max-w-none');
    expect(cover!.className).toContain('block');
    expect(cover!.className).toContain('object-cover');

    const verified = within(mobile).getByRole('img', {
      name: 'Verified creator',
    });
    const heading = within(mobile).getByRole('heading', {name: 'Nathanael'});
    // Verified badge sits beside the display name rather than over the avatar photo.
    expect(verified.parentElement).toBe(heading.parentElement);
    expect(verified.closest('[data-slot="avatar"]')).toBeNull();
    expect(verified.className).toContain('size-4.5');
    expect(verified.className).toContain('shrink-0');
    const iconClass = verified.querySelector('svg')!.getAttribute('class')!;
    expect(iconClass).toContain('size-full');
    expect(iconClass).toContain('fill-[var(--biolink-accent)]');
    expect(iconClass).toContain('text-[var(--biolink-accent-foreground)]');
    expect(heading.querySelector('svg')).toBeNull();
  });

  test.each([
    ['rounded-none', 'rounded-none'],
    ['rounded-sm', 'rounded-card-sm'],
    ['rounded-lg', 'rounded-card'],
    ['rounded-full', 'rounded-full'],
  ] as const)(
    'keeps the verified badge beside the display name across Appearance radius %s',
    (radius, avatarRadius) => {
      render(
        <CreatorProfileLayout
          biolink={makeBiolink({is_verified: true})}
          appearance={{btnConfig: {radius}} as never}
          content={[]}
        />,
      );

      const mobile = mobileBranch();
      const avatar = mobile.querySelector<HTMLElement>('[data-slot="avatar"]');
      expect(avatar).toBeTruthy();
      expect(avatar!.className).toContain(avatarRadius);

      const heading = within(mobile).getByRole('heading', {name: 'Nathanael'});
      const badge = within(mobile).getByRole('img', {name: 'Verified creator'});
      expect(badge.parentElement).toBe(heading.parentElement);
      expect(avatar!.parentElement!.contains(badge)).toBe(false);
    },
  );

  test('keeps the shared card edge when the creator has no cover image', () => {
    render(
      <CreatorProfileLayout
        biolink={makeBiolink()}
        appearance={{btnConfig: {shadow: 'soft'}} as never}
        content={[]}
      />,
    );
    const card = mobileBranch().querySelector<HTMLElement>('[data-slot="card"]');
    expect(card).toBeTruthy();
    expect(card!.className).toContain('ring-(color:--biolink-border)');
    expect(card!.className).toContain('outline-(color:--biolink-border)');
    expect(card!.className).not.toContain('ring-0');
  });

  test('shows an accessible, reduced-motion-safe success status only when work is available', () => {
    const biolink = makeBiolink();
    render(
      <CreatorProfileLayout
        biolink={biolink}
        appearance={null}
        content={[]}
      />,
    );

    const statusLabel = within(mobileBranch()).getByText('Available for work');
    const badge = statusLabel.parentElement!;
    expect(badge.className).toContain('bg-[var(--biolink-surface)]');
    expect(badge.className).toContain('backdrop-blur-md');
    expect(badge.className).toContain('backdrop-saturate-150');
    expect(badge.className).toContain('px-2');
    expect(badge.className).toContain('py-0.5');
    expect(badge.className).toContain('text-[11px]');
    expect(badge.className).toContain('rounded-badge');
    expect(badge.className).toContain('border-positive/20');
    // A passive status does not inherit the Appearance button's hard shadow.
    expect(badge.hasAttribute('style')).toBe(false);

    const indicator = badge.querySelector<HTMLElement>(
      '[data-slot="status-indicator"]',
    );
    expect(indicator).toBeTruthy();
    expect(indicator!.getAttribute('aria-hidden')).toBe('true');
    expect(
      [...indicator!.children].some(child =>
        child.className.includes('motion-safe:animate-ping'),
      ),
    ).toBe(true);
  });

  test('does not advertise work availability when the creator disables it', () => {
    const biolink = makeBiolink() as unknown as {
      profile_config: Record<string, unknown>;
    };
    biolink.profile_config.available_for_work = false;

    render(
      <CreatorProfileLayout
        biolink={biolink as never}
        appearance={null}
        content={[]}
      />,
    );

    expect(
      within(mobileBranch()).queryByText('Available for work'),
    ).toBeNull();
    expect(
      mobileBranch().querySelector('[data-slot="status-indicator"]'),
    ).toBeNull();
  });

  test('does not show a verified mark for a string false API value', () => {
    render(
      <CreatorProfileLayout
        biolink={makeBiolink({is_verified: 'false'})}
        appearance={null}
        content={[]}
      />,
    );

    expect(
      within(mobileBranch()).queryByRole('img', {name: 'Verified creator'}),
    ).toBeNull();
  });
});

describe('public creator card responsive readability (SF-06)', () => {
  test('keeps a long creator name, readable bio and primary action inside the mobile profile', async () => {
    const longName = 'CreatorWithAnUnbrokenName'.repeat(8);
    const biolink = makeBiolink() as unknown as {
      profile_config: Record<string, unknown>;
    };
    biolink.profile_config.display_name = longName;
    biolink.profile_config.social_links = {instagram: '@linket'};
    const user = userEvent.setup();
    render(
      <CreatorProfileLayout
        biolink={biolink as never}
        appearance={null}
        content={[shopWidget]}
      />,
    );

    await user.click(within(mobileBranch()).getByRole('button', {name: 'Profile'}));

    const name = within(mobileBranch()).getByRole('heading', {
      level: 1,
      name: longName,
    });
    expect(name.querySelector('span')?.className).toContain('[overflow-wrap:anywhere]');

    const bio = within(mobileBranch()).getByText('Designs things.');
    expect(bio.className).toContain('text-base');

    const message = within(mobileBranch()).getByText('Message').closest('a');
    expect(message).toBeTruthy();
    expect(message!.className).toContain('w-full');
    expect(message!.className).toContain('min-h-11');
    // The mock router writes "to" rather than resolving it into "href".
    expect(message!.getAttribute('to')).toBe('mailto:hi@example.com');

    // The mocked router exposes a raw `to` attribute, not a real href:
    // select by accessible label rather than role="link" in this DOM fixture.
    const instagram = within(mobileBranch()).getByLabelText(
      'Instagram username',
    );
    expect(instagram.className).toContain('pointer-coarse:min-h-11');
    expect(instagram.className).toContain('pointer-coarse:min-w-11');
  });

  test('phone preview skips mounting duplicate hidden desktop grid', () => {
    const {container} = render(
      <CreatorProfileLayout
        biolink={makeBiolink()}
        appearance={null}
        content={[shopWidget]}
        isPreview
      />,
    );

    expect(container.querySelector('.\\@4xl\\:hidden')).toBeTruthy();
    expect(container.querySelector('.hidden.\\@4xl\\:grid')).toBeNull();
  });

  test('computeVisibleSkillCount keeps skills within two rows and reserves +N room', () => {
    // 7 skills fit in 2 rows (<= 318px each row); an 8th long typo spills to row 3.
    expect(
      computeVisibleSkillCount({
        itemWidths: [62, 98, 60, 56, 72, 60, 84, 128],
        overflowBadgeWidth: 36,
        containerWidth: 318,
      }),
    ).toBe(7);

    // If the +1 badge would push row 2 past containerWidth, drop one more chip.
    expect(
      computeVisibleSkillCount({
        itemWidths: [100, 100, 100, 150, 140, 120],
        overflowBadgeWidth: 40,
        containerWidth: 318,
      }),
    ).toBe(4);

    // All fit within two rows -> no trimming needed.
    expect(
      computeVisibleSkillCount({
        itemWidths: [60, 60, 60, 60, 60],
        overflowBadgeWidth: 36,
        containerWidth: 318,
      }),
    ).toBe(5);
  });

  test('renders +N overflow chip when measured skills exceed two rows and reveals hidden skills on click', async () => {
    const user = userEvent.setup();
    const biolink = makeBiolink() as unknown as {
      profile_config: Record<string, unknown>;
    };
    biolink.profile_config.skills = [
      'Design',
      'Photography',
      'Adobe',
      'Figma',
      'InDesign',
      'Nextjs',
      'JavaScript',
      'Phoafasdfajsdkff',
    ];

    const clientWidthSpy = vi
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockReturnValue(318);
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this.hasAttribute('data-skill-overflow-measure')) {
          return {width: 36, height: 26, top: 0, left: 0, right: 36, bottom: 26, x: 0, y: 0, toJSON: () => ({})} as DOMRect;
        }
        if (this.hasAttribute('data-skill-measure')) {
          const text = this.textContent ?? '';
          const width = text.length > 12 ? 140 : 72;
          return {width, height: 26, top: 0, left: 0, right: width, bottom: 26, x: 0, y: 0, toJSON: () => ({})} as DOMRect;
        }
        return {width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({})} as DOMRect;
      });

    try {
      render(
        <CreatorProfileLayout
          biolink={biolink as never}
          appearance={null}
          content={[]}
          isPreview
        />,
      );

      const list = within(mobileBranch()).getByTestId('creator-skills-list');
      expect(within(list).queryByText('Phoafasdfajsdkff')).toBeNull();

      const overflowTrigger = within(list).getByRole('button', {
        name: /more skill/i,
      });
      expect(overflowTrigger.textContent).toBe('+1');
      expect(overflowTrigger.className).toContain('rounded-badge');

      await user.click(overflowTrigger);
      const popover = document.body.querySelector<HTMLElement>(
        '[data-slot="popover-content"]',
      );
      expect(popover).toBeTruthy();
      expect(within(popover!).getByText('Phoafasdfajsdkff')).toBeTruthy();
    } finally {
      clientWidthSpy.mockRestore();
      rectSpy.mockRestore();
    }
  });
});
