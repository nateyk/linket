/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import type {ComponentProps, ReactElement, ReactNode} from 'react';
import {afterEach, expect, it, vi} from 'vitest';
import type {BackendFilter} from './backend-filter';
import {AddFilterPopover} from './add-filter-popover';

const mocks = vi.hoisted(() => ({
  setQueryState: vi.fn(),
  activeFilters: [] as string[],
}));

vi.mock('@shadcn/table/utils/use-table-query-state', () => ({
  useTableQueryState: () => ({
    setQueryState: mocks.setQueryState,
    activeFilters: mocks.activeFilters,
  }),
}));
vi.mock('@ui/i18n/use-trans', () => ({
  useTrans: () => ({trans: ({message}: {message: string}) => message}),
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));
vi.mock('./filter-trans', () => ({
  FilterTrans: ({label}: {label: ReactNode}) => <>{label}</>,
}));
vi.mock('@shadcn/button/button', () => ({
  Button: ({
    color: _color,
    variant: _variant,
    ...props
  }: ComponentProps<'button'> & {color?: string; variant?: string}) => (
    <button {...props} />
  ),
}));
vi.mock('@shadcn/popover/popover', async () => {
  const {cloneElement, createContext, useContext} = await import('react');
  type PopoverState = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };
  const Context = createContext<PopoverState>({
    open: false,
    onOpenChange: () => {},
  });
  return {
    Popover: {
      Root: ({open, onOpenChange, children}: PopoverState & {children: ReactNode}) => (
        <Context.Provider value={{open, onOpenChange}}>{children}</Context.Provider>
      ),
      Trigger: ({
        render: trigger,
        children,
      }: {
        render: ReactElement<ComponentProps<'button'>>;
        children: ReactNode;
      }) => {
        const {open, onOpenChange} = useContext(Context);
        return cloneElement(trigger, {onClick: () => onOpenChange(!open)}, children);
      },
      Portal: ({children}: {children: ReactNode}) => {
        const {open} = useContext(Context);
        return open ? <>{children}</> : null;
      },
      Content: ({children, className}: {children: ReactNode; className?: string}) => (
        <div data-testid="filter-popover-panel" className={className}>{children}</div>
      ),
    },
  };
});

const filters: BackendFilter[] = [
  {
    key: 'device',
    label: 'Device',
    popoverContent: ({onApply, onDismiss}) => (
      <div>
        <button onClick={() => onApply({value: 'mobile', operator: 'eq'})}>
          Select mobile
        </button>
        <button onClick={onDismiss}>Back to filters</button>
      </div>
    ),
  },
  {
    key: 'browser',
    label: 'Browser',
    popoverContent: ({onApply}) => (
      <button onClick={() => onApply({value: 'Chrome', operator: 'contains'})}>
        Select Chrome
      </button>
    ),
  },
];

afterEach(() => {
  cleanup();
  mocks.activeFilters = [];
  mocks.setQueryState.mockReset();
});

it('opens the compact mobile filter, applies the selected device and closes the popover', () => {
  render(<AddFilterPopover filters={filters} compactOnMobile variant="outline" />);
  const trigger = screen.getByRole('button', {name: 'Filter'});
  expect(trigger.className).toContain('size-10');
  expect(trigger.querySelector('span')?.className).toContain('sr-only');

  fireEvent.click(trigger);
  expect(screen.getByRole('button', {name: 'Device'})).toBeTruthy();
  const panel = screen.getByTestId('filter-popover-panel');
  expect(panel.className).toContain('overflow-y-auto');

  fireEvent.click(screen.getByRole('button', {name: 'Device'}));
  expect(screen.getByRole('button', {name: 'Select mobile'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Select mobile'}));

  expect(mocks.setQueryState).toHaveBeenCalledWith({
    device: {value: 'mobile', operator: 'eq'},
  });
  expect(screen.queryByTestId('filter-popover-panel')).toBeNull();
});

it('allows returning to the filter list and choosing another filter', () => {
  render(<AddFilterPopover filters={filters} />);
  const trigger = screen.getByRole('button', {name: 'Filter'});
  expect(trigger.className).not.toContain('size-10');
  expect(trigger.querySelector('span')?.className).not.toContain('sr-only');

  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('button', {name: 'Device'}));
  fireEvent.click(screen.getByRole('button', {name: 'Back to filters'}));
  fireEvent.click(screen.getByRole('button', {name: 'Browser'}));
  fireEvent.click(screen.getByRole('button', {name: 'Select Chrome'}));

  expect(mocks.setQueryState).toHaveBeenCalledWith({
    browser: {value: 'Chrome', operator: 'contains'},
  });
});

it('disables already-active filter choices but keeps other filters selectable', () => {
  mocks.activeFilters = ['device'];
  render(<AddFilterPopover filters={filters} compactOnMobile />);

  fireEvent.click(screen.getByRole('button', {name: 'Filter'}));
  expect(screen.getByRole('button', {name: 'Device'})).toHaveProperty('disabled', true);
  expect(screen.getByRole('button', {name: 'Browser'})).toHaveProperty('disabled', false);
});
