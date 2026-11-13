/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {HcManagerRow} from '@app/help-center/manager/layout/hc-manager-row';
import {afterEach, describe, expect, it, vi} from 'vitest';

const sortable = vi.hoisted(() => ({options: null as null | {disabled: boolean}}));
vi.mock('@ui/interactions/dnd/sortable/use-sortable', () => ({
  useSortable: (options: {disabled: boolean}) => {
    sortable.options = options;
    return {sortableProps: {}, dragHandleRef: {current: null}};
  },
}));
vi.mock('@ui/interactions/dnd/drag-preview', () => ({
  DragPreview: () => null,
}));
vi.mock('@ui/utils/hooks/is-touch-device', () => ({
  useIsTouchDevice: () => false,
}));
vi.mock('@ui/i18n/use-trans', () => ({
  useTrans: () => ({trans: ({message}: {message: string}) => message}),
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));
vi.mock('@ui/menu/menu-trigger', () => ({
  MenuTrigger: ({children}: {children: React.ReactNode[]}) => <>{children[0]}</>,
  Menu: () => null,
  MenuItem: () => null,
}));

afterEach(() => {
  cleanup();
  sortable.options = null;
});

describe('Help Center manager rows', () => {
  it('offers a keyboard-native navigation action while retaining separate reorder and action controls', () => {
    const onClick = vi.fn();
    const onSortEnd = vi.fn();
    const item = {id: 42, name: 'Getting started'};
    const {container} = render(
      <HcManagerRow
        item={item}
        items={[item]}
        onClick={onClick}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSortEnd={onSortEnd}
      >
        Getting started
      </HcManagerRow>,
    );

    const title = screen.getByRole('button', {name: 'Getting started'});
    fireEvent.click(title);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', {name: 'Reorder'})).toBeTruthy();
    expect(screen.getByRole('button', {name: 'More actions'})).toBeTruthy();
    expect(container.querySelector('h3 button')).toBe(title);
    expect(sortable.options?.disabled).toBe(false);
  });

  it('disables reorder while a mutation runs without disabling navigation or actions', () => {
    const item = {id: 9, name: 'Long category name with Amharic መመሪያ'};
    const onClick = vi.fn();
    render(
      <HcManagerRow
        item={item}
        items={[item]}
        isReordering
        onClick={onClick}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onSortEnd={vi.fn()}
      >
        {item.name}
      </HcManagerRow>,
    );

    expect(sortable.options?.disabled).toBe(true);
    expect((screen.getByRole('button', {name: 'Reorder'}) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', {name: item.name}));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', {name: 'More actions'})).toBeTruthy();
  });
});
