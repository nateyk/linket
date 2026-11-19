/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {MemoryRouter} from 'react-router';
import {UpgradeButton} from './upgrade-button';

const auth = vi.hoisted(() => ({isSubscribed: false}));

vi.mock('@common/auth/use-auth', () => ({
  useAuth: () => ({isSubscribed: auth.isSubscribed}),
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));

function renderUpgradeButton(
  props: Partial<React.ComponentProps<typeof UpgradeButton>> = {},
) {
  return render(
    <MemoryRouter>
      <UpgradeButton {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.isSubscribed = false;
});
afterEach(cleanup);

describe('UpgradeButton', () => {
  it('shows an animated Get Pro CTA that takes free users to pricing', () => {
    renderUpgradeButton();

    const link = screen.getByRole('link', {name: 'Get Pro'});
    expect(link.getAttribute('href')).toBe('/pricing');
    expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    const wrapper = link.parentElement;
    expect(wrapper?.className).toContain('rounded-button');
    expect(wrapper?.className).toContain('focus-within:ring-2');
    const animatedBorder = wrapper?.querySelector('.animate-spin');
    expect(animatedBorder).not.toBeNull();
    expect(animatedBorder?.className).toContain('motion-reduce:animate-none');
    expect(animatedBorder?.parentElement?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('sends subscribed users to plan management rather than pricing', () => {
    auth.isSubscribed = true;
    renderUpgradeButton();

    const link = screen.getByRole('link', {name: 'Manage plan'});
    expect(link.getAttribute('href')).toBe(
      '/account-settings/billing/change-plan',
    );
    expect(screen.queryByRole('link', {name: 'Get Pro'})).toBeNull();
  });

  it('preserves custom link props, layout classes and labels', () => {
    renderUpgradeButton({
      className: 'w-full',
      title: 'Subscription options',
      size: 'sm',
      children: 'See plans',
    });

    const link = screen.getByRole('link', {name: 'See plans'});
    expect(link.getAttribute('title')).toBe('Subscription options');
    expect(link.getAttribute('href')).toBe('/pricing');
    expect(link.parentElement?.className).toContain('w-full');
    expect(link.className).toContain('h-8');
  });

  it('keeps solid usage-dialog CTAs unanimated with their original label', () => {
    renderUpgradeButton({
      variant: 'default',
      color: 'primary',
      className: 'w-full',
      size: 'sm',
      children: 'Upgrade now',
    });

    const link = screen.getByRole('link', {name: 'Upgrade now'});
    expect(link.getAttribute('href')).toBe('/pricing');
    expect(link.className).toContain('w-full');
    expect(link.className).toContain('bg-primary');
    expect(document.querySelector('.animate-spin')).toBeNull();
  });
});
