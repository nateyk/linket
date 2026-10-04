/**
 * @vitest-environment jsdom
 */
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';

const items = [
  {value: 'designer', label: 'Designer'},
  {value: 'engineer', label: 'Engineer'},
];

function renderCombobox(value: {value: string; label: string} | null) {
  return render(
    <Combobox.Root
      items={items}
      value={value}
      onValueChange={() => {}}
      bindToHookForm={false}
      itemToStringLabel={item => item.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <Combobox.Input clearLabel="Clear profile title" />
      <Combobox.Content>
        <Combobox.List>{(item: (typeof items)[0]) => item.label}</Combobox.List>
      </Combobox.Content>
    </Combobox.Root>,
  );
}

test('clear button is keyboard reachable and named (A-21)', async () => {
  renderCombobox(items[0]);

  const clear = await screen.findByRole('button', {
    name: 'Clear profile title',
  });
  expect(clear.getAttribute('tabindex')).toBe('0');
});

test('clear button is not rendered while the field is empty (A-21)', () => {
  const {container} = renderCombobox(null);

  expect(container.querySelector('[data-slot="dropdown-clear"]')).toBeNull();
});

test('clear button falls back to a generic name when none is passed (A-21)', async () => {
  render(
    <Combobox.Root
      items={items}
      value={items[0]}
      onValueChange={() => {}}
      bindToHookForm={false}
      itemToStringLabel={item => item.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <Combobox.Input />
    </Combobox.Root>,
  );

  const clear = await screen.findByRole('button', {name: 'Clear'});
  expect(clear.getAttribute('tabindex')).toBe('0');
});
