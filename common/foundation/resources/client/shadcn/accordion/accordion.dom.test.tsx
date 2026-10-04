/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {Accordion} from './accordion';

function renderAccordion() {
  return render(
    <Accordion.Root>
      <Accordion.Item value="section">
        <Accordion.Trigger>Section</Accordion.Trigger>
        <Accordion.Content>Body</Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>,
  );
}

test('accordion trigger uses the shared outline ring, not underline-only focus (A-14)', () => {
  renderAccordion();

  const trigger = screen.getByRole('button', {name: 'Section'});
  expect(trigger.className).toContain('focus-visible:outline-2');
  expect(trigger.className).toContain('focus-visible:outline-solid');
  expect(trigger.className).not.toContain('focus-visible:underline');
});

test('accordion ring is inset so the item/root overflow-hidden cannot clip it (A-14)', () => {
  renderAccordion();

  const trigger = screen.getByRole('button', {name: 'Section'});
  expect(trigger.className).toMatch(
    /focus-visible:(-outline-offset-2|outline-offset-\[-2px\])/,
  );
});
