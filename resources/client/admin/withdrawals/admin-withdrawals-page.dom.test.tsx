/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {Component} from './admin-withdrawals-page';

const fixture = vi.hoisted(() => ({
  response: {
    data: [{id: 7}],
    meta: {
      counters: {
        requested: {total: 2, amounts_by_currency: {ETB: 10000, USD: 2000}},
        processing: {total: 1, amounts_by_currency: {ETB: 7000}},
        paid: {total: 1, amounts_by_currency: {ETB: 5000}},
        rejected: {total: 0, amounts_by_currency: {}},
        cancelled: {total: 0, amounts_by_currency: {}},
      },
      withdrawal_methods: [{id: 1, name: 'Telebirr'}, {id: 2, name: 'CBE Birr'}],
    },
  },
  setQueryState: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('@common/core/use-show-global-loading-bar', () => ({
  useShowGlobalLoadingBar: () => null,
}));
vi.mock('@common/seo/static-page-title', () => ({
  StaticPageTitle: () => null,
}));
vi.mock('@common/ui/dashboard/dashboard-layout', () => ({
  DashboardLayout: {
    MainSection: 'main',
    SidebarToggle: 'span',
    SectionHeader: 'header',
    SectionTitle: 'h1',
    SectionContent: 'section',
    SectionContentHeader: 'div',
  },
}));
vi.mock('@shadcn/card/card', () => ({
  Card: {
    Root: 'div',
    Header: 'div',
    Title: 'h2',
    Description: 'p',
    Action: 'div',
    Content: 'div',
  },
}));
vi.mock('@shadcn/button/button', () => ({
  Button: ({nativeButton: _nativeButton, render: _render, variant: _variant, size: _size, ...props}: any) => <button {...props} />,
}));
vi.mock('@shadcn/forms/input/input', () => ({
  Input: ({bindToHookForm: _bindToHookForm, ...props}: any) => <input {...props} />,
}));
vi.mock('@shadcn/empty/empty', () => ({
  Empty: {Root: 'div', Header: 'div', Media: 'div', Title: 'p', Description: 'p'},
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));
vi.mock('@ui/i18n/format-money', () => ({
  formatMoney: (cents: number, currency: string) => String(cents) + ' ' + currency,
}));
vi.mock('react-router', () => ({
  Link: ({to, ...props}: any) => <a href={to} {...props} />,
}));
vi.mock('@common/datatable/filters/add-filter-button', () => ({
  AddFilterButton: () => <button>Filter</button>,
}));
vi.mock('@common/datatable/filters/filter-list/filter-list', () => ({
  FilterList: () => null,
}));
vi.mock('@shadcn/table/utils/table-search-input', () => ({
  TableSearchInput: () => <input aria-label="Search withdrawals" />,
}));
vi.mock('@shadcn/table/generic-table', () => ({
  GenericTable: () => <div role="table">Withdrawal rows</div>,
}));
vi.mock('@shadcn/table/utils/table-pagination', () => ({
  TablePagination: () => null,
}));
vi.mock('@shadcn/table/utils/use-table', () => ({
  useTable: () => ({}),
}));
vi.mock('@shadcn/table/utils/use-table-query-state', () => ({
  useTableQueryState: () => ({
    queryState: {
      sort: null, page: 1, per_page: 15,
      date_from: null, date_to: null, withdrawal_method: null,
    },
    setQueryState: fixture.setQueryState,
    deferredSearchParams: {},
    isFiltering: false,
    isLoading: false,
  }),
}));
vi.mock('@tanstack/react-query', () => ({
  useSuspenseQuery: () => ({
    data: fixture.response,
    isFetching: false,
    refetch: fixture.refetch,
  }),
}));
vi.mock('./admin-withdrawals-queries', () => ({
  adminWithdrawalsOptions: () => ({queryKey: ['adminWithdrawals']}),
}));
vi.mock('./admin-withdrawals-datatable-columns', () => ({
  adminWithdrawalsColumns: [],
}));
vi.mock('./admin-withdrawals-datatable-filters', () => ({
  AdminWithdrawalsDatatableFilters: [],
}));

beforeEach(() => {
  fixture.setQueryState.mockClear();
  fixture.refetch.mockClear();
});
afterEach(cleanup);

it('shows per-currency withdrawal counters rather than adding ETB and USD', () => {
  render(<Component />);

  expect(screen.getByRole('heading', {name: 'Withdrawals'})).toBeTruthy();
  expect(screen.getByText('Requested')).toBeTruthy();
  expect(screen.getByText('Processing')).toBeTruthy();
  expect(screen.getByText('Paid')).toBeTruthy();
  expect(screen.getByText('Rejected')).toBeTruthy();
  expect(screen.getByText('Cancelled')).toBeTruthy();
  expect(screen.getByText('10000 ETB')).toBeTruthy();
  expect(screen.getByText('2000 USD')).toBeTruthy();
  expect(screen.getByText('Recorded as paid')).toBeTruthy();
});

it('filters by date and method through the existing server query-state contract', () => {
  render(<Component />);
  fireEvent.change(screen.getByLabelText('From date'), {target: {value: '2026-11-01'}});
  fireEvent.change(screen.getByLabelText('To date'), {target: {value: '2026-11-17'}});
  fireEvent.change(screen.getByLabelText('Withdrawal method'), {target: {value: 'Telebirr'}});

  expect(fixture.setQueryState).toHaveBeenCalledWith({date_from: '2026-11-01', page: 1});
  expect(fixture.setQueryState).toHaveBeenCalledWith({date_to: '2026-11-17', page: 1});
  expect(fixture.setQueryState).toHaveBeenCalledWith({withdrawal_method: 'Telebirr', page: 1});
  fireEvent.click(screen.getByRole('button', {name: 'Reset filters'}));
  expect(fixture.setQueryState).toHaveBeenCalledWith({
    query: '', status: null, transfer_status: null,
    date_from: null, date_to: null, withdrawal_method: null, page: 1,
  });
  const refresh = screen.getByRole('button', {name: 'Refresh withdrawals'});
  fireEvent.click(refresh);
  expect(fixture.refetch).toHaveBeenCalledOnce();
});
