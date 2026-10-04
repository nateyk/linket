/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
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
