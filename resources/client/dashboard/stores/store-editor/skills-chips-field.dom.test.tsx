/**
 * @vitest-environment jsdom
 */
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {fireEvent, render, screen} from '@testing-library/react';
import {useForm, UseFormReturn} from 'react-hook-form';
import {expect, test} from 'vitest';
import {CreatorProfileForm} from './creator-profile-form-values';
import {formatSkillLabel, parseSkills, SkillsChipsField} from './skills-chips-field';

type FormRef = {current: UseFormReturn<CreatorProfileForm> | null};

/**
 * A-12: the form keeps skills as one comma-separated string, but it is edited
 * as chips. This mirrors the profile editor's field wiring — label, control,
 * error — so the contract tested here is the one the editor ships.
 */
function SkillsHarness({
  initialSkills,
  formRef,
}: {
  initialSkills: string;
  formRef: FormRef;
}) {
  const form = useForm<CreatorProfileForm>({
    defaultValues: {skills: initialSkills},
  });
  formRef.current = form;
  return (
    <HookForm.Root form={form} onSubmit={() => {}}>
      <HookForm.Field name="skills">
        <Field.Label>Skills</Field.Label>
        <SkillsChipsField placeholder="Design, Photography, Coaching" />
        <Field.Error />
      </HookForm.Field>
    </HookForm.Root>
  );
}

function renderSkills(initialSkills: string) {
  const formRef: FormRef = {current: null};
  render(<SkillsHarness initialSkills={initialSkills} formRef={formRef} />);
  return formRef.current!;
}

/** The draft input, located exactly as a screen reader user would find it. */
function input(): HTMLInputElement {
  return screen.getByLabelText('Skills') as HTMLInputElement;
}

/** Chip remove labels in DOM (= chip) order: `Remove :skill`. */
function skillRemoveLabels(): string[] {
  return screen
    .queryAllByRole('button', {name: /^Remove /})
    .map(button => button.getAttribute('aria-label') ?? '');
}

test('the draft input carries the field label', () => {
  renderSkills('');

  expect(input().type).toBe('text');
});

test('typing a skill and pressing Enter adds a chip and stores it', () => {
  const form = renderSkills('');

  fireEvent.change(input(), {target: {value: 'Rust'}});
  fireEvent.keyDown(input(), {key: 'Enter'});

  expect(skillRemoveLabels()).toEqual(['Remove Rust']);
  expect(form.getValues('skills')).toBe('Rust');
  expect(input().value).toBe('');
});

test('a comma commits the skill being typed without a trailing comma', () => {
  const form = renderSkills('');

  fireEvent.change(input(), {target: {value: 'Branding'}});
  fireEvent.keyDown(input(), {key: ','});

  expect(skillRemoveLabels()).toEqual(['Remove Branding']);
  expect(form.getValues('skills')).toBe('Branding');
});

test('committed skills are trimmed', () => {
  const form = renderSkills('');

  fireEvent.change(input(), {target: {value: '  Rust  '}});
  fireEvent.keyDown(input(), {key: 'Enter'});

  expect(skillRemoveLabels()).toEqual(['Remove Rust']);
  expect(form.getValues('skills')).toBe('Rust');
});

test('a duplicate of an existing skill is ignored, whatever its casing', () => {
  const form = renderSkills('design');

  fireEvent.change(input(), {target: {value: ' Design '}});
  fireEvent.keyDown(input(), {key: 'Enter'});

  expect(skillRemoveLabels()).toEqual(['Remove design']);
  expect(form.getValues('skills')).toBe('design');
  expect(input().value).toBe('');
});

test('an empty or whitespace-only commit adds nothing', () => {
  const form = renderSkills('');

  fireEvent.keyDown(input(), {key: 'Enter'});
  fireEvent.change(input(), {target: {value: '   '}});
  fireEvent.keyDown(input(), {key: 'Enter'});

  expect(skillRemoveLabels()).toEqual([]);
  expect(form.getValues('skills')).toBe('');
});

test('the ninth skill is rejected with an inline live-region message', () => {
  const eight = 'One, Two, Three, Four, Five, Six, Seven, Eight';
  const form = renderSkills(eight);

  fireEvent.change(input(), {target: {value: 'Ninth'}});
  fireEvent.keyDown(input(), {key: 'Enter'});

  expect(skillRemoveLabels().length).toBe(8);
  expect(form.getValues('skills')).toBe(eight);
  expect(screen.getByRole('status').textContent).toBe(
    'You can add up to 8 skills.',
  );
  // The un-addable text is kept in the input: rejected work is never eaten.
  expect(input().value).toBe('Ninth');
});

test('pasting a comma-separated list splits into chips', () => {
  const form = renderSkills('');

  fireEvent.paste(input(), {
    clipboardData: {getData: () => 'Design, Photography, Coaching'},
  });

  expect(skillRemoveLabels()).toEqual([
    'Remove Design',
    'Remove Photography',
    'Remove Coaching',
  ]);
  expect(form.getValues('skills')).toBe('Design, Photography, Coaching');
});

test('a chip removes itself through its named remove button', () => {
  const form = renderSkills('Design, Photography');

  fireEvent.click(screen.getByRole('button', {name: 'Remove Photography'}));

  expect(skillRemoveLabels()).toEqual(['Remove Design']);
  expect(form.getValues('skills')).toBe('Design');
});

test('Backspace on an empty draft removes the last chip', () => {
  const form = renderSkills('Design, Photography');

  fireEvent.keyDown(input(), {key: 'Backspace'});

  expect(skillRemoveLabels()).toEqual(['Remove Design']);
  expect(form.getValues('skills')).toBe('Design');
});

test('removing a chip returns focus to the draft input', () => {
  renderSkills('Design, Photography');
  const remove = screen.getByRole('button', {name: 'Remove Photography'});
  remove.focus();
  fireEvent.click(remove);

  expect(document.activeElement).toBe(input());
});

test('formatSkillLabel strips pasted list bullets', () => {
  expect(formatSkillLabel('• Architecture')).toBe('Architecture');
  expect(formatSkillLabel('- Design')).toBe('Design');
  expect(formatSkillLabel('  Photography')).toBe('Photography');
});

test('parseSkills cleans bullets when splitting the stored string', () => {
  expect(parseSkills('• Architecture, Interior Design')).toEqual([
    'Architecture',
    'Interior Design',
  ]);
});
