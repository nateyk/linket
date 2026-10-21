import {Button} from '@shadcn/button/button';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {XIcon} from 'lucide-react';
import {
  use,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import {mergeRefs} from 'react-merge-refs';

/**
 * The public profile shows at most eight skills (A-12). The form keeps one
 * comma-separated string — the payload shape the backend already expects —
 * and this control edits it as chips.
 */
export const SKILLS_MAX = 8;

/** Strip pasted list bullets so chips stay clean labels. */
export function formatSkillLabel(skill: string): string {
  return skill.replace(/^[\s•·●▪◦*-]+/u, '').trim();
}

/** The stored comma-separated value as the chips the editor shows. */
export function parseSkills(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map(skill => formatSkillLabel(skill))
    .filter(Boolean);
}

/** The same box and focus ring as the combobox chips field. */
const chipsContainerStyles =
  'flex min-h-9 flex-wrap items-center gap-1.5 rounded-input border border-input bg-transparent bg-clip-padding px-3 py-1.5 text-sm transition-[color,box-shadow,background-color] focus-within:border-transparent focus-within:outline-2 focus-within:outline-solid has-aria-invalid:border-destructive has-aria-invalid:outline-destructive has-aria-invalid:focus-within:outline-1 has-data-[slot=skills-chip]:px-1.5 dark:bg-input/30';

const chipStyles =
  'flex h-[calc(--spacing(5.5))] w-fit items-center justify-center gap-1 rounded-md bg-secondary px-2 text-xs font-medium whitespace-nowrap text-secondary-foreground has-data-[slot=skills-chip-remove]:pe-0 dark:bg-input/60';

export function SkillsChipsField({placeholder}: {placeholder?: string}) {
  const {trans} = useTrans();
  const field = use(HookForm.FieldContext);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [limitMessage, setLimitMessage] = useState('');

  const chips = parseSkills(field?.value);

  const removeChipAt = (index: number) => {
    field?.onChange(
      chips.filter((_, chipIndex) => chipIndex !== index).join(', '),
    );
    setLimitMessage('');
    // The remove button unmounts with the chip; focus must not fall to body.
    inputRef.current?.focus();
  };

  /**
   * Consumes typed, pasted or committed text: splits it on commas, trims,
   * drops the empty entries and duplicates, and refuses past the cap. Text
   * that could not be added stays in the input — rejected work is never
   * eaten — while everything consumed is cleared.
   */
  const consume = (raw: string) => {
    const next = [...chips];
    const rejected: string[] = [];

    for (const part of raw
      .split(',')
      .map(part => part.trim())
      .filter(Boolean)) {
      if (next.some(skill => skill.toLowerCase() === part.toLowerCase())) {
        continue;
      }
      if (next.length >= SKILLS_MAX) {
        rejected.push(part);
        continue;
      }
      next.push(part);
    }

    if (next.length !== chips.length) {
      field?.onChange(next.join(', '));
      setLimitMessage('');
    }
    if (rejected.length) {
      setLimitMessage(trans(message('You can add up to 8 skills.')));
      setDraft(rejected.join(', '));
    } else {
      setDraft('');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter must not submit the form; the comma must not land as text.
      event.preventDefault();
      consume(draft);
    } else if (event.key === 'Backspace' && draft === '' && chips.length) {
      event.preventDefault();
      removeChipAt(chips.length - 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData?.getData('text') ?? '';
    // Inserted text commits like typed text: "a, b, c" becomes three chips.
    event.preventDefault();
    consume(`${draft}${pasted}`);
  };

  return (
    <>
      <div data-slot="skills-chips" className={chipsContainerStyles}>
        {chips.map((skill, index) => (
          <span
            key={`${index}-${skill}`}
            data-slot="skills-chip"
            className={chipStyles}
          >
            {skill}
            <Button
              type="button"
              variant="ghost"
              color="default"
              size="icon-xs"
              data-slot="skills-chip-remove"
              aria-label={trans(message('Remove :skill', {values: {skill}}))}
              className="-ms-1 opacity-50 hover:opacity-100"
              onClick={() => removeChipAt(index)}
            >
              <XIcon className="pointer-events-none" />
            </Button>
          </span>
        ))}
        <Input
          bindToHookForm={false}
          ref={mergeRefs([inputRef, field?.ref ?? null])}
          value={draft}
          disabled={field?.disabled}
          placeholder={placeholder}
          onChange={event => setDraft(event.target.value)}
          onBlur={() => field?.onBlur()}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          data-slot="skills-chip-input"
          className="h-7 min-w-16 flex-1 rounded-none border-0 px-0 text-sm outline-none"
        />
      </div>
      {/* Always mounted so screen readers announce the cap message when its
          text arrives; while empty it is sr-only, adding no layout gap. */}
      <div
        role="status"
        className={cn('text-sm text-destructive', !limitMessage && 'sr-only')}
      >
        {limitMessage}
      </div>
    </>
  );
}
