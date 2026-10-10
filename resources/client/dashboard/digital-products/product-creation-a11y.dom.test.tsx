/**
 * @vitest-environment jsdom
 */
import fs from 'node:fs';
import path from 'node:path';
import {useState} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {fireEvent, render, screen} from '@testing-library/react';
import {useBootstrapDataStore} from '@ui/bootstrap-data/bootstrap-data-store';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import {BillingModePicker} from './billing-mode-picker';
import {CreateProductDialog} from './create-product-dialog';
import {type BillingMode, visibleSteps} from './product-create-flow';
import {
  WizardStepDots,
  type ProductCreateWizard,
} from './product-create-wizard';
import {ProductTypePicker, type ProductType} from './product-type-picker';

vi.mock('@app/dashboard/use-usage', () => ({
  useUsage: () => ({
    data: {
      data: {
        storage: {used: 12582912, total: 1073741824},
      },
    },
  }),
}));

const pickerDir = 'resources/client/dashboard/digital-products';

function readSource(name: string): string {
  return fs.readFileSync(path.resolve(pickerDir, name), 'utf8');
}

function expectExtractable(source: string, literal: string) {
  const flat = source.replace(/\s+/g, ' ');
  expect(
    flat.includes(`message: '${literal}'`) ||
      flat.includes(`message="${literal}"`),
    `expected extractable Trans/trans usage for: ${literal}`,
  ).toBe(true);
}

function fakeWizard(step: 'type' | 'billing' | 'price') {
  return {
    step,
    steps: visibleSteps(step === 'price' ? 'paid' : null),
  } as ProductCreateWizard;
}

describe('R06 product type picker semantics', () => {
  test('renders a radiogroup with four radio options', () => {
    render(<ProductTypePicker value={null} onValueChange={() => {}} />);
    expect(screen.getByRole('radiogroup')).not.toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  test('arrow keys move selection between options', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<ProductTypePicker value="digital" onValueChange={onValueChange} />);
    const radios = screen.getAllByRole('radio');
    radios[0].focus();
    await user.keyboard('{ArrowDown}');
    expect(onValueChange).toHaveBeenCalledWith('ebook');
  });

  test('selects the focused option', () => {
    const onValueChange = vi.fn();
    render(<ProductTypePicker value={null} onValueChange={onValueChange} />);
    const radios = screen.getAllByRole('radio');
    radios[2].focus();
    fireEvent.click(document.activeElement!);
    expect(onValueChange).toHaveBeenCalledWith('audio');
  });

  test('visually marks only the selected product type', () => {
    const {container} = render(
      <ProductTypePicker value="digital" onValueChange={() => {}} />,
    );
    const options = container.querySelectorAll('label');
    expect(options[0].className).toContain('bg-primary/5');
    expect(options[1].className).not.toContain('bg-primary/5');
    expect(options[2].className).not.toContain('bg-primary/5');
    expect(options[3].className).not.toContain('bg-primary/5');
  });
});

describe('R06 billing mode picker semantics', () => {  test('renders a radiogroup with two radio options', () => {
    render(<BillingModePicker value={null} onValueChange={() => {}} />);
    expect(screen.getByRole('radiogroup')).not.toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  test('arrow keys move selection between options', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BillingModePicker value="free" onValueChange={onValueChange} />);
    const radios = screen.getAllByRole('radio');
    radios[0].focus();
    await user.keyboard('{ArrowDown}');
    expect(onValueChange).toHaveBeenCalledWith('paid');
  });
});

describe('R07 wizard step indicators', () => {  test('renders an ordered step list with aria-current on the active step', () => {
    render(<WizardStepDots wizard={fakeWizard('billing')} />);
    const list = screen.getByRole('list');
    expect(list).not.toBeNull();
    expect(list.querySelectorAll('li')).toHaveLength(2);
    const current = list.querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
  });

  test('shows visible Step X of Y text and per-step names', () => {
    render(<WizardStepDots wizard={fakeWizard('billing')} />);
    expect(screen.getByText('Step 2 of 2')).not.toBeNull();
    expect(screen.getByText('Free or paid?')).not.toBeNull();
  });
});

function renderDialog(onOpenChange = vi.fn()) {
  localStorage.clear();
  render(
    <MemoryRouter>
      <CreateProductDialog open onOpenChange={onOpenChange} />
    </MemoryRouter>,
  );
  return onOpenChange;
}

describe('R08 dialog close confirmation', () => {  beforeEach(() => {
    localStorage.clear();
  });

  test('closing with selections prompts before discarding', async () => {
    const user = userEvent.setup();
    const onOpenChange = renderDialog();
    await user.click(screen.getByRole('radio', {name: /digital product/i}));
    await user.click(screen.getByRole('button', {name: /^cancel$/i}));
    expect(screen.getByText('Discard this product?')).not.toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  test('confirming discards state and closes', async () => {
    const user = userEvent.setup();
    const onOpenChange = renderDialog();
    await user.click(screen.getByRole('radio', {name: /digital product/i}));
    await user.click(screen.getByRole('button', {name: /^cancel$/i}));
    await user.click(screen.getByRole('button', {name: /^discard$/i}));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // State is back to a fresh wizard (persist effect may rewrite the
    // initial state after reset clears it — behaviorally equivalent).
    const stored = localStorage.getItem('productCreateWizard');
    expect(
      stored === null ||
        JSON.parse(stored).state.type === null,
    ).toBe(true);
  });

  test('closing with no input resets silently', async () => {
    const user = userEvent.setup();
    const onOpenChange = renderDialog();
    await user.click(screen.getByRole('button', {name: /^cancel$/i}));
    expect(screen.queryByText('Discard this product?')).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('R09 picker strings are translatable', () => {
  test('every type option title, description and group label is an extractable Trans/trans literal', () => {
    const source = readSource('product-type-picker.tsx');
    for (const literal of [
      'Digital product',
      'Any set of files to download or stream.',
      'E-book',
      'Offer a book or comic in PDF and EPUB formats.',
      'Audio',
      'Sell music, podcasts, or any audio content.',
      'Course',
      'Sell a structured curriculum with chapters, lessons, video and resources.',
      'Product type',
    ]) {
      expectExtractable(source, literal);
    }
  });

  test('every billing option title, description and group label is an extractable Trans/trans literal', () => {
    const source = readSource('billing-mode-picker.tsx');
    for (const literal of [
      'Free',
      'Anyone can access it for free.',
      'Paid',
      'Charge a one-time price in ETB.',
      'Billing mode',
    ]) {
      expectExtractable(source, literal);
    }
  });

  test('step navigation label and discard confirmation are extractable literals', () => {
    const wizard = readSource('product-create-wizard.tsx');
    expectExtractable(wizard, 'Product creation steps');
    const dialog = readSource('create-product-dialog.tsx');
    for (const literal of [
      'Discard this product?',
      'Your progress in this wizard will be lost. This action cannot be undone.',
      'Discard',
    ]) {
      expectExtractable(dialog, literal);
    }
  });

  test('picker renders option copy through Trans', () => {
    render(<ProductTypePicker value={null} onValueChange={() => {}} />);
    expect(
      screen.getByText('Offer a book or comic in PDF and EPUB formats.'),
    ).not.toBeNull();
  });
});

describe('R13 progress total is derived', () => {
  test('form passes the actual section count, not a hardcoded total', () => {
    const source = readSource('digital-product-form-page.tsx');
    expect(source).toContain('total={SECTION_ORDER.length}');
    expect(source).not.toMatch(/total=\{[0-9]+\}/);
  });
});

function renderTypePicker() {
  useBootstrapDataStore.setState({data: null} as never);
  useBootstrapDataStore.getState().mergeData({
    i18n: {active: 'en', locales: []},
    product_file_formats: {
      digital: {
        extensions: ['pdf', 'epub', 'zip', 'txt'],
        accept: '.pdf,.epub,.zip,.txt',
        hint: 'PDF, EPUB, ZIP, or TXT',
      },
      ebook: {
        extensions: ['pdf', 'epub'],
        accept: '.pdf,.epub',
        hint: 'PDF or EPUB',
      },
      audio: {
        extensions: ['mp3', 'm4a', 'wav'],
        accept: '.mp3,.m4a,.wav',
        hint: 'MP3, M4A, or WAV',
      },
      course: {
        extensions: ['pdf'],
        accept: '.pdf',
        hint: 'PDF, EPUB, ZIP, or TXT',
      },
    },
  } as never);
  const queryClient = new QueryClient({
    defaultOptions: {queries: {retry: false}},
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ProductTypePicker value={null} onValueChange={() => {}} />
    </QueryClientProvider>,
  );
}

describe('R18 limits visible in picker', () => {
  beforeEach(() => {
    useBootstrapDataStore.setState({data: null} as never);
  });

  test('each non-course option shows its server-provided format hint', () => {
    renderTypePicker();
    expect(screen.getByText('PDF, EPUB, ZIP, or TXT')).not.toBeNull();
    expect(screen.getByText('PDF or EPUB')).not.toBeNull();
    expect(screen.getByText('MP3, M4A, or WAV')).not.toBeNull();
  });

  test('digital and ebook hints differ', () => {
    renderTypePicker();
    const digitalHint = screen.getByText('PDF, EPUB, ZIP, or TXT');
    const ebookHint = screen.getByText('PDF or EPUB');
    expect(digitalHint.textContent).not.toBe(ebookHint.textContent);
  });

  test('storage usage line is shown from entitlement data', () => {
    renderTypePicker();
    expect(screen.getByText(/storage/i)).not.toBeNull();
  });
});

// T1: the picker cards must never read as "two active options". The focus
// treatment lives on a focus-visible-only class that is only ever painted by
// the card whose radio input is focused, while selection comes from `value`.
const FOCUS_STYLING_CLASS = 'has-[:focus-visible]:outline-2';
const SELECTION_CLASSES = ['bg-primary/5', 'border-primary/60'] as const;

function labelsIn(container: HTMLElement): HTMLLabelElement[] {
  return Array.from(container.querySelectorAll('label'));
}

function carriesSelectionStyling(label: HTMLLabelElement): boolean {
  return SELECTION_CLASSES.every(c => label.className.includes(c));
}

// "Carries focus styling" = the focus-visible card classes are present AND the
// card's radio input is the focused one (the classes only paint under
// :focus-visible, so class presence alone is the mechanism, focus is the state).
function carriesFocusStyling(label: HTMLLabelElement): boolean {
  return (
    label.className.includes(FOCUS_STYLING_CLASS) &&
    label.matches(':has(:focus)')
  );
}

function focusedLabel(): HTMLLabelElement | null {
  const active = document.activeElement as HTMLElement | null;
  return active?.closest('label') ?? null;
}

function ControlledTypePicker() {
  const [value, setValue] = useState<ProductType | null>('digital');
  return <ProductTypePicker value={value} onValueChange={setValue} />;
}

function ControlledBillingPicker() {
  const [value, setValue] = useState<BillingMode | null>('free');
  return <BillingModePicker value={value} onValueChange={setValue} />;
}

describe('T1 focus styling is distinct from selection styling', () => {
  test('type picker: focused-but-unselected card gets focus styling only, selected card gets selection styling only', () => {
    const {container} = render(
      <ProductTypePicker value="ebook" onValueChange={() => {}} />,
    );
    const labels = labelsIn(container);
    const radios = screen.getAllByRole('radio');

    // Selection sits on option B (ebook).
    expect(carriesSelectionStyling(labels[1])).toBe(true);

    // Move focus to option A (digital) without changing the selection.
    radios[0].focus();
    expect(document.activeElement).toBe(radios[0]);
    expect(focusedLabel()).toBe(labels[0]);

    // (a) option A: carries focus styling, NOT selection styling.
    expect(labels[0].className).toContain(FOCUS_STYLING_CLASS);
    expect(carriesFocusStyling(labels[0])).toBe(true);
    expect(carriesSelectionStyling(labels[0])).toBe(false);

    // (a) vice versa: option B carries selection styling, NOT focus styling.
    expect(carriesSelectionStyling(labels[1])).toBe(true);
    expect(carriesFocusStyling(labels[1])).toBe(false);

    // The dual-highlight class (focus-within ring on every card) is gone.
    for (const label of labels) {
      expect(label.className).not.toContain('focus-within:');
    }
    // Never both treatments on the same card in this scenario.
    for (const label of labels) {
      expect(carriesFocusStyling(label) && carriesSelectionStyling(label)).toBe(
        false,
      );
    }
  });

  test('billing picker: focused-but-unselected card gets focus styling only, selected card gets selection styling only', () => {
    const {container} = render(
      <BillingModePicker value="paid" onValueChange={() => {}} />,
    );
    const labels = labelsIn(container);
    const radios = screen.getAllByRole('radio');

    // Selection sits on option B (paid).
    expect(carriesSelectionStyling(labels[1])).toBe(true);

    // Focus option A (free) without selecting it.
    radios[0].focus();
    expect(document.activeElement).toBe(radios[0]);
    expect(focusedLabel()).toBe(labels[0]);

    expect(labels[0].className).toContain(FOCUS_STYLING_CLASS);
    expect(carriesFocusStyling(labels[0])).toBe(true);
    expect(carriesSelectionStyling(labels[0])).toBe(false);

    expect(carriesSelectionStyling(labels[1])).toBe(true);
    expect(carriesFocusStyling(labels[1])).toBe(false);

    for (const label of labels) {
      expect(label.className).not.toContain('focus-within:');
    }
  });

  test('type picker: arrow-key focus move keeps exactly one selected card', async () => {
    const user = userEvent.setup();
    const {container} = render(<ControlledTypePicker />);
    expect(
      labelsIn(container).filter(carriesSelectionStyling),
    ).toHaveLength(1);

    screen.getAllByRole('radio')[0].focus();
    await user.keyboard('{ArrowDown}');

    const labels = labelsIn(container);
    const selected = labels.filter(carriesSelectionStyling);
    expect(selected).toHaveLength(1);
    expect(selected[0]).toBe(labels[1]);
    expect(focusedLabel()).toBe(selected[0]);
    expect(carriesFocusStyling(selected[0])).toBe(true);
  });

  test('billing picker: arrow-key focus move keeps exactly one selected card', async () => {
    const user = userEvent.setup();
    const {container} = render(<ControlledBillingPicker />);
    expect(
      labelsIn(container).filter(carriesSelectionStyling),
    ).toHaveLength(1);

    screen.getAllByRole('radio')[0].focus();
    await user.keyboard('{ArrowDown}');

    const labels = labelsIn(container);
    const selected = labels.filter(carriesSelectionStyling);
    expect(selected).toHaveLength(1);
    expect(selected[0]).toBe(labels[1]);
    expect(focusedLabel()).toBe(selected[0]);
    expect(carriesFocusStyling(selected[0])).toBe(true);
  });
});

describe('focus management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('advancing steps moves focus into the new step', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <CreateProductDialog open onOpenChange={() => {}} />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('radio', {name: /course/i}));
    await user.click(screen.getByRole('button', {name: /continue/i}));
    const active = document.activeElement as HTMLElement | null;
    expect(active?.getAttribute('role')).toBe('radio');
  });
});
