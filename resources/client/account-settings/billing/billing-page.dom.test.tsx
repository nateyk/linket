/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Component} from './billing-page';

vi.mock('@app/dashboard/layout/sidenav/usage-dialog', () => ({
  UsageGrid: () => <div>Usage grid</div>,
}));
vi.mock('@common/billing/billing-page/active-trial-banner', () => ({
  ActiveTrialBanner: () => null,
}));
vi.mock('@common/billing/billing-page/panels/active-plan-panel', () => ({
  ActivePlanPanel: () => <div>Active plan panel</div>,
}));
vi.mock('@common/billing/billing-page/panels/cancelled-plan-panel', () => ({
  CancelledPlanPanel: () => <div>Cancelled plan panel</div>,
}));
vi.mock('@common/billing/billing-page/panels/free-plan-panel', () => ({
  FreePlanPanel: () => <div>Free plan panel</div>,
}));
vi.mock('@common/billing/billing-page/panels/invoice-history-panel', () => ({
  InvoiceHistoryPanel: () => <div>Invoices panel</div>,
}));
vi.mock('@shadcn/button/button', () => ({
  LinkButton: ({
    to,
    children,
  }: {
    to: string;
    children: React.ReactNode;
  }) => <a href={to}>{children}</a>,
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));
vi.mock('react-router', () => ({
  useOutletContext: () => ({subscription: null}),
}));
vi.mock('./subscription-billing-history', () => ({
  SubscriptionBillingHistory: () => <section>Pro subscription panel</section>,
}));

afterEach(cleanup);

it('uses the Linket billing hierarchy without legacy payment method UI', () => {
  render(<Component />);

  expect(screen.getByText('Billing overview')).toBeTruthy();
  expect(screen.getByText('Free plan panel')).toBeTruthy();
  expect(screen.getByText('Usage grid')).toBeTruthy();
  expect(screen.getByText('Pro subscription panel')).toBeTruthy();
  expect(screen.getByText('Invoices panel')).toBeTruthy();

  expect(screen.getByRole('link', {name: 'View Pro'}).getAttribute('href')).toBe(
    '/pricing',
  );
  expect(
    screen.getByRole('link', {name: 'Billing help'}).getAttribute('href'),
  ).toBe('/help');

  expect(screen.queryByText('Payment method')).toBeNull();
  expect(screen.queryByText('Legacy billing')).toBeNull();
});
