/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {Component} from './admin-creators-page';

const api = vi.hoisted(() => ({get: vi.fn()}));
const queryState = vi.hoisted(() => ({
  filters: {
    page: 1,
    search: '',
    plan: '',
    status: '',
    subscription: '',
    attention: '',
    sort: '-created_at',
  },
  setFilters: vi.fn(),
}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@common/http/errors/parsed-api-error', () => ({
  getApiErrorMessage: () => 'Request failed',
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => message,
}));
vi.mock('@common/seo/static-page-title', () => ({
  StaticPageTitle: ({children}: {children: React.ReactNode}) => children,
}));
vi.mock('@common/ui/dashboard/dashboard-layout', () => ({
  DashboardLayout: {
    MainSection: 'main',
    SectionHeader: 'header',
    SidebarToggle: 'span',
    SectionTitle: 'h1',
    SectionContent: 'section',
  },
}));
vi.mock('@shadcn/card/card', () => ({
  Card: Object.assign(
    ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    {
      Root: 'div',
      Header: 'div',
      Title: 'h2',
      Description: 'p',
      Content: 'div',
      Action: 'div',
    },
  ),
}));
vi.mock('@shadcn/button/button', () => ({Button: 'button'}));
vi.mock('@shadcn/badge/badge', () => ({Badge: 'span'}));
vi.mock('@shadcn/alert/alert', () => ({
  Alert: {Root: 'div', Title: 'h3', Description: 'p'},
}));
vi.mock('@shadcn/empty/empty', () => ({
  Empty: {
    Root: 'div',
    Header: 'div',
    Media: 'div',
    Title: 'h3',
    Description: 'p',
    Content: 'div',
  },
}));
vi.mock('@shadcn/forms/input/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));
vi.mock('@shadcn/forms/select/select', () => ({
  Select: {
    Root: 'div',
    Trigger: 'button',
    Value: 'span',
    Content: 'div',
    Item: 'option',
  },
}));
vi.mock('@shadcn/skeleton/skeleton', () => ({Skeleton: 'div'}));
vi.mock('@shadcn/table/table', () => ({
  Table: {
    Root: 'table',
    Header: 'thead',
    Body: 'tbody',
    Row: 'tr',
    Head: 'th',
    Cell: 'td',
  },
}));
vi.mock('@shadcn/dropdown/dropdown', () => ({
  Dropdown: {
    Root: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Trigger: ({children}: {children: React.ReactNode}) => children,
    Content: ({children}: {children: React.ReactNode}) => children,
    Item: 'button',
  },
}));
vi.mock('@shadcn/tooltip/tooltip', () => ({
  Tooltip: {
    Provider: ({children}: {children: React.ReactNode}) => children,
    Root: ({children}: {children: React.ReactNode}) => children,
    Trigger: ({children}: {children: React.ReactNode}) => children,
    Content: ({children}: {children: React.ReactNode}) => children,
  },
}));
vi.mock('nuqs', () => ({
  parseAsInteger: {withDefault: () => ({})},
  parseAsString: {withDefault: () => ({})},
  useQueryStates: () => [queryState.filters, queryState.setFilters],
}));
vi.mock('react-router', () => ({
  Link: 'a',
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('admin creators page', () => {
  it('renders overview metrics and creator rows from the API', async () => {
    api.get.mockImplementation((url: string) => {
      if (url.endsWith('/overview')) {
        return Promise.resolve({
          data: {
            data: {
              total_creators: 2,
              active_accounts: 2,
              suspended_accounts: 0,
              free_plan_creators: 1,
              pro_plan_creators: 1,
              verified_sales_consumed: 5,
              expiring_subscriptions: 1,
              expired_subscriptions: 1,
              pending_renewal_subscriptions: 1,
              pending_receiving_reviews: 3,
              creators_needing_attention: 1,
            },
          },
        });
      }
      return Promise.resolve({
        data: {
          data: {
            data: [
              {
                id: 1,
                name: 'Creator One',
                email: 'one@example.test',
                is_suspended: false,
                is_pro: true,
                subscription_lifecycle: 'expiring',
                verified_sales_consumed: 3,
                verified_sales_remaining: 7,
                stores_count: 1,
                products_count: 2,
                pending_receiving_accounts_count: 2,
                needs_attention: true,
              },
            ],
            current_page: 1,
            last_page: 1,
            total: 1,
          },
        },
      });
    });
    render(<Component />);
    expect((await screen.findAllByText('Creator One')).length).toBeGreaterThan(0);
    expect(screen.getByText('Total creators')).toBeTruthy();
    expect(screen.getByText('Expiring Pro: :count')).toBeTruthy();
    expect(screen.getAllByText('Pending renewal').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Expiring').length).toBeGreaterThan(0);
    expect(screen.queryByText('Receiving accounts')).toBeNull();
    expect(screen.queryByText('Pending reviews')).toBeNull();
    expect(screen.getAllByText('Needs review').length).toBeGreaterThan(0);
    expect(screen.getByText('Creator directory')).toBeTruthy();
  });
});
