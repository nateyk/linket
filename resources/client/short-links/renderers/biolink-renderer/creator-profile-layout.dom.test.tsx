/**
 * @vitest-environment jsdom
 */
import {render, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {CreatorProfileLayout} from './creator-profile-layout';

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
  ShopWidgetRenderer: () => (
    <div data-testid="shop-widget">
      <h2>Products</h2>
      <p>Digital product one</p>
      <p>Digital product two</p>
    </div>
  ),
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

function makeBiolink() {
  return {
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

describe('creator profile on mobile', () => {
  test('(a) Profile shows the card and no tab strip', () => {
    renderProfile();

    expect(section('Profile')).toBeTruthy();
    // Scoped to the section: the desktop grid renders the same card.
    expect(within(section('Profile')!).getByText('Nathanael')).toBeTruthy();
    expect(
      within(section('Profile')!).getByText('Creative director'),
    ).toBeTruthy();
    // The Products | About strip belongs to the desktop grid.
    expect(within(mobileBranch()).queryByTestId('storefront')).toBeNull();
    // Neither of the other sections is mounted alongside it.
    expect(section('Products')).toBeNull();
    expect(section('About')).toBeNull();
  });

  test('(b) tapping Products shows only the products', async () => {
    const user = userEvent.setup();
    renderProfile();

    await user.click(navButton('Products'));

    expect(section('Products')).toBeTruthy();
    expect(within(mobileBranch()).getByTestId('shop-widget')).toBeTruthy();
    expect(section('Profile')).toBeNull();
    expect(section('About')).toBeNull();
    // Still no tab strip on mobile.
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

  test('the nav is the only way between sections, and marks the current one', async () => {
    const user = userEvent.setup();
    renderProfile();

    // A nav, not a tablist: buttons with aria-pressed, never tabs without
    // tabpanels.
    expect(within(mobileBranch()).queryByRole('tablist')).toBeNull();
    expect(navButton('Profile').getAttribute('aria-pressed')).toBe('true');
    expect(navButton('Products').getAttribute('aria-pressed')).toBe('false');

    await user.click(navButton('About'));

    expect(navButton('About').getAttribute('aria-pressed')).toBe('true');
    expect(navButton('Profile').getAttribute('aria-pressed')).toBe('false');
  });

  test('(d) switching resets the scroll to the top', async () => {
    const user = userEvent.setup();
    renderProfile();
    (window.scrollTo as ReturnType<typeof vi.fn>).mockClear();

    await user.click(navButton('Products'));
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

    expect(section('Profile')).toBeTruthy();
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