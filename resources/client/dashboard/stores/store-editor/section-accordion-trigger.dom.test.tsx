/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {PackageCheckIcon, UserRoundIcon} from 'lucide-react';

import {Accordion} from '@shadcn/accordion/accordion';
import {BuilderSectionHeader} from './builder-section-header';
import {SectionAccordionTrigger} from './section-accordion-trigger';

/** The text a screen reader reads after the trigger name. */
function describedTexts(trigger: HTMLElement): string {
  return (trigger.getAttribute('aria-describedby') || '')
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}

function renderSection(
  trigger: React.ReactNode,
  {value = 'profile'}: {value?: string} = {},
) {
  return render(
    <Accordion.Root>
      <Accordion.Item value={value}>{trigger}</Accordion.Item>
    </Accordion.Root>,
  );
}

test('trigger name is the section title alone (A-09)', () => {
  renderSection(
    <SectionAccordionTrigger>
      <BuilderSectionHeader
        icon={UserRoundIcon}
        title="Profile"
        description="Name, photo, bio, and skills."
      />
    </SectionAccordionTrigger>,
  );

  const trigger = screen.getByRole('button', {name: 'Profile'});
  expect(trigger).toBeTruthy();
});

test('description is exposed via aria-describedby, not in the name (A-09)', () => {
  renderSection(
    <SectionAccordionTrigger>
      <BuilderSectionHeader
        icon={UserRoundIcon}
        title="Profile"
        description="Name, photo, bio, and skills."
      />
    </SectionAccordionTrigger>,
  );

  const trigger = screen.getByRole('button', {name: 'Profile'});
  expect(describedTexts(trigger)).toContain('Name, photo, bio, and skills.');
});

test('badge phrases are appended to the description (A-09)', () => {
  renderSection(
    <SectionAccordionTrigger descriptionPhrase="2 of 6 products featured">
      <BuilderSectionHeader
        icon={PackageCheckIcon}
        title="Products"
        description="Feature up to six Digital Products."
        trailing={<span>2/6</span>}
      />
    </SectionAccordionTrigger>,
    {value: 'products'},
  );

  // The visible badge must not leak into the accessible name…
  const trigger = screen.getByRole('button', {name: 'Products'});
  // …but its phrase and the description are both read after the name.
  const described = describedTexts(trigger);
  expect(described).toContain('Feature up to six Digital Products.');
  expect(described).toContain('2 of 6 products featured');
});

test('wrapper keeps native accordion behaviour (A-09)', () => {
  renderSection(
    <SectionAccordionTrigger>
      <BuilderSectionHeader
        icon={UserRoundIcon}
        title="Profile"
        description="Name, photo, bio, and skills."
      />
    </SectionAccordionTrigger>,
  );

  const trigger = screen.getByRole('button', {name: 'Profile'});
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(trigger);
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
});
