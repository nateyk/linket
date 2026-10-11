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

// T4: the heading level is an additive opt-in. Default stays <h3> (every
// existing usage is unchanged); headingRender swaps only the heading element.
test('trigger heading defaults to h3 (T4)', () => {
  renderAccordion();

  const heading = screen.getByRole('heading', {level: 3, name: /Section/});
  expect(heading.tagName.toLowerCase()).toBe('h3');
});

test('headingRender swaps the heading element, keeping the trigger intact (T4)', () => {
  render(
    <Accordion.Root>
      <Accordion.Item value="section">
        <Accordion.Trigger headingRender={<h2 />}>Section</Accordion.Trigger>
        <Accordion.Content>Body</Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>,
  );

  const heading = screen.getByRole('heading', {level: 2, name: /Section/});
  expect(heading.tagName.toLowerCase()).toBe('h2');
  // The trigger button inside keeps its wiring (Base UI merges the heading
  // props onto the render element; the button is untouched).
  const trigger = screen.getByRole('button', {name: 'Section'});
  expect(heading.contains(trigger)).toBe(true);
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});
