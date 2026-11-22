/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {StatusBadge} from './digital-products-page';

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => message,
}));
afterEach(cleanup);

describe('digital product status badge', () => {
  it('renders update under review for approved product with pending update', () => {
    render(<StatusBadge status="approved" hasPendingUpdate />);
    const badge = screen.getByText('Update under review');
    expect(badge).toBeTruthy();
    expect(badge.className).toContain('text-warning');
  });

  it.each([
    ['pending_approval', 'In review', 'text-warning'],
    ['approved', 'Live', 'text-positive'],
    ['rejected', 'Needs changes', 'text-destructive'],
    ['archived', 'Archived', 'bg-secondary'],
    ['draft', 'Draft', 'bg-secondary'],
  ] as const)('renders %s status', (status, label, expectedClass) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByText(label);
    expect(badge).toBeTruthy();
    expect(badge.className).toContain(expectedClass);
  });
});
