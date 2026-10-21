/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import BottomNavBar from './bottom-nav-bar';

/**
 * The bar is the only way to switch sections on a phone, and everything it
 * does on switch is decorative: a spring entrance, a label that slides open, a
 * press scale. Under `prefers-reduced-motion` those have to stand down while
 * the state change itself still happens.
 */

const motionState = {reduced: false};

// framer-motion's useReducedMotion reads a media query; drive it directly so
// the test does not depend on how framer subscribes.
vi.mock('framer-motion', async () => {
  const actual =
    await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => motionState.reduced,
    motion: new Proxy(
      {},
      {
        get(_target, prop) {
          // Render any motion.* element as a plain element with the same props
          // minus the animation ones, so the DOM is inspectable.
          const tag = String(prop).replace(/^motion\./, '');
          const Tag = tag as 'div';
          return ({
            children,
            ...props
          }: {
            children?: React.ReactNode;
          } & Record<string, unknown>) => {
            const {
              initial: _i,
              animate: _a,
              transition: _t,
              whileTap: _w,
              variants: _v,
              ...rest
            } = props;
            return <Tag {...rest}>{children}</Tag>;
          };
        },
      },
    ),
  };
});

const items = [
  {label: 'Profile', icon: () => null},
  {label: 'Products', icon: () => null},
  {label: 'About', icon: () => null},
];

beforeEach(() => {
  motionState.reduced = false;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('BottomNavBar', () => {
  test('switches sections when a button is pressed', async () => {
    const user = userEvent.setup();
    const onIndexChange = vi.fn();
    render(<BottomNavBar items={items} onIndexChange={onIndexChange} />);

    await user.click(screen.getByRole('button', {name: 'Products'}));

    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  test('marks the active item for assistive tech', async () => {
    const user = userEvent.setup();
    render(<BottomNavBar items={items} activeIndex={0} />);

    expect(
      screen.getByRole('button', {name: 'Profile'}).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getByRole('button', {name: 'About'}).getAttribute('aria-pressed'),
    ).toBe('false');

    await user.click(screen.getByRole('button', {name: 'About'}));

    // Controlled: the parent owns the state, so the pressed item is unchanged
    // until it re-renders with a new index.
    expect(
      screen.getByRole('button', {name: 'Profile'}).getAttribute('aria-pressed'),
    ).toBe('true');
  });

  test('drops the decorative transitions when motion is reduced', () => {
    motionState.reduced = true;
    render(<BottomNavBar items={items} activeIndex={1} />);

    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('motion-reduce:transition-none');
    for (const button of screen.getAllByRole('button')) {
      expect(button.className).toContain('motion-reduce:transition-none');
    }
  });

  test('keeps them when motion is allowed', () => {
    motionState.reduced = false;
    render(<BottomNavBar items={items} activeIndex={1} />);

    expect(screen.getByRole('navigation').className).not.toContain(
      'motion-reduce:transition-none',
    );
  });

  test('applies inactive biolink chrome when provided', () => {
    render(
      <BottomNavBar
        items={items}
        activeIndex={0}
        inactiveButtonClassName="text-[var(--biolink-muted-text)]"
      />,
    );

    expect(
      screen.getByRole('button', {name: 'Products'}).className,
    ).toContain('text-[var(--biolink-muted-text)]');
  });
});