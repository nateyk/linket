/**
 * @vitest-environment jsdom
 */
import {act, fireEvent, render, screen} from '@testing-library/react';
import {useState} from 'react';
import {expect, test, vi} from 'vitest';
import {Tabs} from './tabs';

function renderTabs() {
  return render(
    <Tabs.Root defaultValue="a">
      <Tabs.List>
        <Tabs.Tab value="a">Alpha</Tabs.Tab>
        <Tabs.Tab value="b">Beta</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="a">Panel A</Tabs.Panel>
      <Tabs.Panel value="b">Panel B</Tabs.Panel>
    </Tabs.Root>,
  );
}

test('inactive tab text uses the AA contrast token, never the 4.29:1 one (A-08)', () => {
  renderTabs();

  const inactive = screen.getByRole('tab', {name: 'Beta'});
  expect(inactive.className).toContain('text-foreground/70');
  expect(inactive.className).not.toContain('text-foreground/60');
});

test('tab triggers get the shared focus ring (A-14)', () => {
  renderTabs();

  const tab = screen.getByRole('tab', {name: 'Beta'});
  expect(tab.className).toContain('focus-visible:outline-2');
  expect(tab.className).toContain('focus-visible:outline-solid');
  expect(tab.className).toContain('focus-visible:outline-offset-2');
});

function renderControlledTabs({activateOnFocus}: {activateOnFocus?: boolean}) {
  const onValueChange = vi.fn();
  /**
   * Stateful value, the way the editor's router-driven value behaves:
   * activation actually moves the selection, so focus/activation tests
   * exercise the same transitions users see.
   */
  function Harness() {
    const [value, setValue] = useState('a');
    return (
      <Tabs.Root
        value={value}
        onValueChange={(next, details) => {
          setValue(next as string);
          onValueChange(next, details);
        }}
      >
        <Tabs.List activateOnFocus={activateOnFocus}>
          <Tabs.Tab value="a">Alpha</Tabs.Tab>
          <Tabs.Tab value="b">Beta</Tabs.Tab>
          <Tabs.Tab value="c">Gamma</Tabs.Tab>
        </Tabs.List>
      </Tabs.Root>
    );
  }
  const utils = render(<Harness />);
  const first = screen.getByRole('tab', {name: 'Alpha'});
  const middle = screen.getByRole('tab', {name: 'Beta'});
  const last = screen.getByRole('tab', {name: 'Gamma'});
  return {onValueChange, first, middle, last, ...utils};
}

test('arrow keys activate the next tab with activateOnFocus (A-11)', async () => {
  const {onValueChange, first} = renderControlledTabs({
    activateOnFocus: true,
  });

  // Composite focus moves happen in a microtask; async act flushes them.
  await act(async () => {
    first.focus();
    fireEvent.keyDown(first, {key: 'ArrowRight'});
  });

  expect(onValueChange).toHaveBeenCalled();
  expect(onValueChange.mock.calls.at(-1)?.[0]).toBe('b');
});

test('arrow keys jump to the first/last tab with Home/End (A-11)', async () => {
  const {onValueChange, middle, last} = renderControlledTabs({
    activateOnFocus: true,
  });

  await act(async () => {
    middle.focus();
    fireEvent.keyDown(middle, {key: 'End'});
  });
  expect(onValueChange.mock.calls.at(-1)?.[0]).toBe('c');

  await act(async () => {
    last.focus();
    fireEvent.keyDown(last, {key: 'Home'});
  });
  expect(onValueChange.mock.calls.at(-1)?.[0]).toBe('a');
});

test('without activateOnFocus arrows move focus but never activate (A-11)', async () => {
  const {onValueChange, first, middle} = renderControlledTabs({});

  await act(async () => {
    first.focus();
    fireEvent.keyDown(first, {key: 'ArrowRight'});
  });

  expect(document.activeElement).toBe(middle);
  expect(onValueChange).not.toHaveBeenCalled();
});
