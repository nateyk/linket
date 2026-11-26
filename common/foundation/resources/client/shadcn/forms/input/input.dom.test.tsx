/**
 * @vitest-environment jsdom
 */
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {Input} from '@shadcn/forms/input/input';
import {InputGroup, InputGroupInput} from '@shadcn/forms/input-group/input-group';
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {render} from '@testing-library/react';
import {describe, expect, test} from 'vitest';

describe('unified form control focus ring', () => {
  test('Input, Textarea, and SelectTrigger share the rounded primary focus outline without black offset outlines', () => {
    const {container} = render(
      <div>
        <Input bindToHookForm={false} aria-label="Email" />
        <Textarea bindToHookForm={false} aria-label="Notes" />
        <Select.Root>
          <Select.Trigger aria-label="Status">
            <Select.Value />
          </Select.Trigger>
        </Select.Root>
      </div>,
    );

    const controls = [
      container.querySelector('[data-slot="input"]')!,
      container.querySelector('[data-slot="textarea"]')!,
      container.querySelector('[data-slot="dropdown-trigger"]')!,
    ];

    for (const control of controls) {
      expect(control.className).toContain('rounded-input');
      expect(control.className).toContain('focus-visible:border-transparent');
      expect(control.className).toContain('focus-visible:outline-2');
      expect(control.className).toContain('focus-visible:outline-solid');
      expect(control.className).toContain('focus-visible:outline-ring');
      expect(control.className).not.toContain('focus-visible:outline-foreground');
      expect(control.className).not.toContain('focus-visible:outline-offset-2');
    }
  });

  test('InputGroup and ComboboxChips align with the primary ring outline', () => {
    const {container} = render(
      <div>
        <InputGroup>
          <InputGroupInput aria-label="Search" />
        </InputGroup>
        <Combobox.Root multiple value={[]}>
          <Combobox.Chips>
            <Combobox.ChipsInput aria-label="Tags" />
          </Combobox.Chips>
        </Combobox.Root>
      </div>,
    );

    const group = container.querySelector('[data-slot="input-group"]')!;
    expect(group.className).toContain('rounded-input');
    expect(group.className).toContain('has-[[data-slot=input-group-control]:focus-visible]:outline-ring');
    expect(group.className).toContain('has-[[data-slot=input-group-control]:focus-visible]:border-transparent');

    const chips = container.querySelector('[data-slot="dropdown-chips"]')!;
    expect(chips.className).toContain('rounded-input');
    expect(chips.className).toContain('focus-within:outline-ring');
    expect(chips.className).toContain('focus-within:border-transparent');
  });
});
