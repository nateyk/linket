/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vitest';
import {StoreFront} from './store-front';

/**
 * In the tabbed desktop layout the tab label replaces the visible section
 * heading, so the document outline would jump from the profile h1 straight to
 * the card h3s. Each panel therefore carries an sr-only h2 of its tab label:
 * these tests keep that heading attached to the panel it names.
 */

vi.mock('@ui/i18n/use-trans', () => ({
  useTrans: () => ({
    trans: (m: {message?: string} | string) =>
      typeof m === 'string' ? m : (m.message ?? ''),
  }),
}));

vi.mock('./biolink-background', () => ({
  Background: () => <div data-testid="background" />,
}));

function renderStoreFront() {
  return render(
    <StoreFront
      appearance={null}
      tabs={[
        {id: 'products', label: 'Products', content: <p>Midnight Signals</p>},
        {id: 'about', label: 'About', content: <p>Bio</p>},
      ]}
    />,
  );
}

describe('storefront tab panels', () => {
  test('the active panel carries an sr-only h2 of its tab label', () => {
    renderStoreFront();

    const heading = screen.getByRole('heading', {level: 2, name: 'Products'});
    expect(heading.className).toContain('sr-only');
    expect(screen.getByText('Midnight Signals')).toBeTruthy();
    // The label stays visible in the strip; only the heading is hidden.
    expect(screen.getAllByText('Products').length).toBe(2);
  });

  test('switching tabs brings the next panel heading with it', async () => {
    const user = userEvent.setup();
    renderStoreFront();

    await user.click(screen.getByRole('tab', {name: 'About'}));

    const heading = screen.getByRole('heading', {level: 2, name: 'About'});
    expect(heading.className).toContain('sr-only');
    expect(screen.getByText('Bio')).toBeTruthy();
  });

  test.each(['rounded-none', 'rounded-sm', 'rounded-lg', 'rounded-full'] as const)(
    'tabs list, indicator, and tabs follow Appearance Corner roundness %s without leaving rounded-full behind',
    radius => {
      render(
        <StoreFront
          appearance={{btnConfig: {radius}} as never}
          tabs={[
            {id: 'products', label: 'Products', content: <p>Midnight Signals</p>},
            {id: 'services', label: 'Services', content: <p>Consulting</p>},
            {id: 'about', label: 'About', content: <p>Bio</p>},
          ]}
        />,
      );

      const list = screen.getByRole('tablist', {name: 'Creator profile sections'});
      const tabs = screen.getAllByRole('tab');
      const indicator = list.querySelector('span[aria-hidden], span:not([role])') ?? list.lastElementChild!;

      expect(list.className.split(/\s+/)).not.toContain('rounded-full');
      expect(list.className.split(/\s+/)).not.toContain('rounded-button');
      expect(list.className.split(/\s+/)).toContain('rounded-card');
      expect(indicator.className.split(/\s+/)).toContain('rounded-button');
      for (const tab of tabs) {
        expect(tab.className.split(/\s+/)).not.toContain('rounded-full');
        expect(tab.className.split(/\s+/)).toContain('rounded-button');
      }
    },
  );
});
