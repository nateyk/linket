/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {VerifyEtMethodCatalog} from './verify-et-method-catalog';

const api = vi.hoisted(() => ({get: vi.fn(), patch: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@ui/i18n/trans', () => ({Trans: ({message}: {message: string}) => message}));
vi.mock('@shadcn/button/button', () => ({Button: 'button'}));
vi.mock('@shadcn/card/card', () => ({
  Card: {Root: 'div', Header: 'div', Title: 'h2', Description: 'p', Content: 'div'},
}));
vi.mock('@shadcn/badge/badge', () => ({Badge: 'span'}));
vi.mock('@shadcn/spinner/spinner', () => ({Spinner: () => <span>Loading</span>}));
vi.mock('@shadcn/alert-dialog/alert-dialog', () => ({
  AlertDialog: {
    Root: ({children, open}: {children: React.ReactNode; open: boolean}) => (open ? <div>{children}</div> : null),
    Portal: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Backdrop: () => null,
    Content: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Header: ({children}: {children: React.ReactNode}) => <header>{children}</header>,
    Title: ({children}: {children: React.ReactNode}) => <h2>{children}</h2>,
    Description: ({children}: {children: React.ReactNode}) => <p>{children}</p>,
    Footer: ({children}: {children: React.ReactNode}) => <footer>{children}</footer>,
    Cancel: ({children}: {children: React.ReactNode}) => <button type="button">{children}</button>,
    Action: ({children, onClick}: {children: React.ReactNode; onClick?: () => void}) => (
      <button type="button" onClick={onClick}>{children}</button>
    ),
  },
}));
vi.mock('./bank-logo', () => ({BankLogo: () => <span>Logo</span>}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('persists setup and checkout controls when the catalog reloads', async () => {
  let method = {id: 1, code: 'telebirr', display_name: 'Telebirr', creator_setup_enabled: true, checkout_enabled: true, operationally_suspended: false};
  api.get.mockImplementation(async () => ({data: {data: [method]}}));
  api.patch.mockImplementation(async (_url: string, changes: Partial<typeof method>) => { method = {...method, ...changes}; return {data: {data: method}}; });
  const page = render(<VerifyEtMethodCatalog />);
  fireEvent.click(await screen.findByRole('button', {name: 'Disable creator setup'}));
  await screen.findByRole('button', {name: 'Enable creator setup'});
  fireEvent.click(screen.getByRole('button', {name: 'Disable checkout'}));
  await screen.findByRole('button', {name: 'Enable checkout'});
  expect(screen.getByRole('status').textContent).toContain('Payment method updated.');
  page.unmount();
  render(<VerifyEtMethodCatalog />);
  await waitFor(() => expect(screen.getByRole('button', {name: 'Enable checkout'})).toBeTruthy());
  expect(screen.getByRole('button', {name: 'Enable creator setup'})).toBeTruthy();
});

it('shows a message when the catalog is empty', async () => {
  api.get.mockResolvedValue({data: {data: []}});
  render(<VerifyEtMethodCatalog />);
  expect(await screen.findByText('No Verify.et payment methods are configured.')).toBeTruthy();
});
