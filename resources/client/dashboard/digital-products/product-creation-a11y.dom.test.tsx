/**
 * @vitest-environment jsdom
 */
import fs from 'node:fs';
import path from 'node:path';
import {useState} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {useBootstrapDataStore} from '@ui/bootstrap-data/bootstrap-data-store';
import userEvent from '@testing-library/user-event';
import {createMemoryRouter, MemoryRouter, RouterProvider} from 'react-router';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {Component as CreateCoursePage} from '../courses/create-course-page';
import {BillingModePicker} from './billing-mode-picker';
import {CreateProductDialog} from './create-product-dialog';
import {Component as DigitalProductEditPage} from './digital-product-form-page';
import {type BillingMode, visibleSteps} from './product-create-flow';
import {
  WizardStepDots,
  type ProductCreateWizard,
} from './product-create-wizard';
import {ProductTypePicker, type ProductType} from './product-type-picker';
import {Component as ProductTypeSelectionPage} from './product-type-selection-page';

// T4: the edit-page heading test mounts the real DigitalProductForm, whose
// product GET must resolve without a server (same approach as
// digital-product-form-page.hydrate.dom.test.tsx). The wizard dialog never
// calls the API (finish only navigates), so this mock is inert for the rest
// of the file.
const editPageApi = vi.hoisted(() => {
  const draftProduct = {
    id: 1,
    title: 'Ethiopian Coffee Ritual Field Guide',
    description: '',
    price_cents: 1500,
    currency: 'etb',
    status: 'draft',
    type: 'digital',
    cover: null,
    cover_file_entry_id: null,
    files: [],
    biolink_ids: [],
  };
  return {
    get: async (url: string) => {
      if (url.startsWith('/api/v1/items/')) {
        return {data: {data: draftProduct}};
      }
      return {data: {data: []}};
    },
  };
});

vi.mock('@common/http/query-client', async () => {
  const {QueryClient} = await import('@tanstack/react-query');
  return {
    queryClient: new QueryClient({defaultOptions: {queries: {retry: false}}}),
    apiClient: {
      get: (url: string) => editPageApi.get(url),
      post: () => Promise.resolve({data: {data: {}}}),
      put: () => Promise.resolve({data: {data: {}}}),
      delete: () => Promise.resolve({data: {data: {}}}),
      request: () => Promise.resolve({data: {data: {}}}),
    },
  };
});

// jsdom has no layout: the edit page's TipTap description editor queries
// Range rects while it mounts (same stub as
// digital-product-form-page.hydrate.dom.test.tsx).
beforeAll(() => {
  const emptyRect: DOMRect = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  };
  Range.prototype.getBoundingClientRect = () => emptyRect;
  Range.prototype.getClientRects = () =>
    ({
      length: 0,
      item: () => null,
      [Symbol.iterator]: function* () {},
    }) as unknown as DOMRectList;
});

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

describe('R07 wizard step indicators (unified ProductFormProgress pattern)', () => {
  test('renders the shared progress bar once, outside the nav; nav keeps aria-current steps list', () => {
    render(<WizardStepDots wizard={fakeWizard('billing')} />);
    const nav = screen.getByRole('navigation', {
      name: 'Product creation steps',
    });
    expect(nav).not.toBeNull();
    // Visible indicator is the same ProductFormProgress bar the
    // course-setup and edit pages use — exactly once, and NOT inside the
    // nav landmark (a progressbar is not navigation; P2 hygiene).
    const bar = screen.getByRole('progressbar');
    expect(nav.contains(bar)).toBe(false);
    // Per-step semantics survive invisibly as an sr-only ordered list
    // inside the named nav.
    const items = within(nav).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('aria-current')).toBeNull();
    expect(items[1].getAttribute('aria-current')).toBe('step');
  });

  test('derives the progress total from the steps and shows truthful position', () => {
    // paid billing → 3 visible steps; the total must come from the step
    // list (3), not be hardcoded.
    render(<WizardStepDots wizard={fakeWizard('price')} />);
    const nav = screen.getByRole('navigation', {
      name: 'Product creation steps',
    });
    const items = within(nav).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    // Accessible per-step names survive (R07).
    expect(items.map(item => item.textContent)).toEqual([
      'What are you selling?',
      'Free or paid?',
      'Set your price',
    ]);
    expect(items[2].getAttribute('aria-current')).toBe('step');
    // Position is visible in the unified bar copy — position wording
    // ("Step 3 of 3"), never a completion claim about the active step.
    expect(screen.getByText('Step 3 of 3')).not.toBeNull();
    expect(screen.queryByText('3 of 3 steps complete')).toBeNull();
  });

  test('first step shows its position before later steps are reached', () => {
    render(<WizardStepDots wizard={fakeWizard('type')} />);
    expect(screen.getByText('Step 1 of 2')).not.toBeNull();
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

describe('R08 one-step dialog dismissal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('cancel closes even after selecting a type, without a false unsaved-product warning', async () => {
    const user = userEvent.setup();
    const onOpenChange = renderDialog();
    await user.click(screen.getByRole('radio', {name: /digital product/i}));
    await user.click(screen.getByRole('button', {name: /^cancel$/i}));
    expect(screen.queryByText('Discard this product?')).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('close without a selection needs no discard confirmation', async () => {
    const user = userEvent.setup();
    const onOpenChange = renderDialog();
    await user.click(screen.getByRole('button', {name: /^cancel$/i}));
    expect(screen.queryByText('Discard this product?')).toBeNull();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('Continue is disabled until a product type is selected', async () => {
    const user = userEvent.setup();
    renderDialog();
    const continueButton = screen.getByRole('button', {name: /continue/i});
    expect(continueButton.hasAttribute('disabled')).toBe(true);
    await user.click(screen.getByRole('radio', {name: /audio/i}));
    expect(continueButton.hasAttribute('disabled')).toBe(false);
  });
});

describe('P2 nested-cards: the wizard dialog has no card inside its panel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // crit1-B: `Dialog.Footer variant="muted"` paints `border-t bg-muted/50` on
  // the footer strip — a second card sitting inside the dialog panel
  // (DESIGN.md "Don't nest a card inside a card"). The footer is an action
  // row, so it must render flat, exactly like the default Dialog.Footer.
  test('footer renders as a plain action row, not a muted strip inside the panel', () => {
    renderDialog();
    const footer = document.querySelector(
      '[data-slot="dialog-footer"]',
    ) as HTMLElement;
    expect(footer).not.toBeNull();
    expect(footer.className).not.toContain('bg-muted');
    expect(footer.className).not.toContain('border-t');
    // The action row itself must survive (Cancel/Back left, Continue right).
    expect(within(footer).getByRole('button', {name: /continue/i})).not.toBeNull();
  });
});

describe('R09 picker strings are translatable', () => {
  test('editor create/edit page headings are static extractable translations', () => {
    const source = readSource('digital-product-form-page.tsx');
    const catalog = JSON.parse(
      fs.readFileSync(path.resolve('resources/client-translations.json'), 'utf8'),
    ) as Record<string, string>;
    for (const literal of [
      'Create digital product',
      'Create e-book',
      'Create audio',
      'Create course',
      'Edit digital product',
      'Edit e-book',
      'Edit audio',
      'Edit course',
    ]) {
      expectExtractable(source, literal);
      expect(catalog[literal], `missing catalog key: ${literal}`).toBe(literal);
    }
    expect(source).not.toContain('<Trans message={pageTitle} />');
  });

  test('validation errors on product files are announced and associated with the focus target', () => {
    const source = readSource('digital-product-form-page.tsx');
    expect(source).toContain("aria-describedby={error ? 'product-files-error' : undefined}");
    expect(source).toContain('id="product-files-error" role="alert"');
  });

  test('every type option title, description and group label is an extractable Trans/trans literal', () => {
    const source = readSource('product-type-picker.tsx');
    for (const literal of [
      'Digital product',
      'Files to download or stream.',
      'E-book',
      'A book or comic in PDF and EPUB.',
      'Audio',
      'Music, podcasts, or other audio.',
      'Course',
      'A curriculum with chapters, lessons, and video.',
      'Product type',
    ]) {
      expectExtractable(source, literal);
    }
  });

  test('every billing option title, description and group label is an extractable Trans/trans literal', () => {
    const source = readSource('billing-mode-picker.tsx');
    // "Free access" / "Buyers pay nothing." — never bare "Free", which
    // collides with the Free plan (10% commission) name.
    for (const literal of [
      'Free access',
      'Buyers pay nothing.',
      'Paid',
      'One-time price in ETB.',
      'Billing mode',
    ]) {
      expectExtractable(source, literal);
    }
    expect(source).not.toContain('message="Free"');
    expect(source).not.toContain("message: 'Free'");
    expect(source).not.toContain('Anyone can access it for free.');
  });

  test('single type-picker instructions are extractable and do not imply a product is saved', () => {
    const dialog = readSource('create-product-dialog.tsx');
    for (const literal of ['What are you selling?', 'Choose a type to open its editor.', 'Cancel', 'Continue']) {
      expectExtractable(dialog, literal);
    }
    expect(dialog).not.toContain('Discard this product?');
  });

  test('progress bar screen-reader labels are extractable and phase-correct', () => {
    // Sections (edit/course) keep "Product setup"; wizard steps use
    // "Product creation" so the modal never claims setup has started.
    const progress = readSource('product-form-progress.tsx');
    expect(progress).not.toContain('aria-label="Product setup progress"');
    expect(progress).not.toContain('aria-label="Product creation progress"');
    expectExtractable(progress, 'Product setup progress');
    expectExtractable(progress, 'Product creation progress');
    expect(progress).toContain("message: 'Product setup progress'");
    expect(progress).toContain("message: 'Product creation progress'");
  });

  test('optional Preview section never increases required setup progress', () => {
    // Reconcile the legacy #97 progress assertion with current editor semantics.
    // An optional sample/Preview step must never block a valid product submission.
    const form = readSource('digital-product-form-page.tsx');
    expect(form).toContain("const progressSections: ProductSetupSection[] = ['details', 'files', 'pricing'];");
    expect(form).toContain('const completedSections = progressSections.filter(isSectionComplete).length;');
    expect(form).toContain('total={progressSections.length}');
    expect(form).not.toContain("const progressSections = sectionOrder.filter(section => section !== 'previews');");
  });

  test('wizard steps progress omits the Product setup heading', () => {
    const progress = readSource('product-form-progress.tsx');
    // Distill: steps variant shows only "Step X of Y" — "Product setup"
    // belongs to the form phase (sections variant), not the decision modal.
    expect(progress).toContain('isSteps');
    expect(progress).toContain('Step :current of :total');
    expect(progress).toContain('message="Product setup"');
    // Product setup heading only renders in the non-steps branch.
    expect(progress).toMatch(
      /isSteps \? \([\s\S]*?Step :current of :total[\s\S]*?\) : \([\s\S]*?message="Product setup"/,
    );
  });

  test('picker renders option copy through Trans', () => {
    render(<ProductTypePicker value={null} onValueChange={() => {}} />);
    expect(
      screen.getByText('A book or comic in PDF and EPUB.'),
    ).not.toBeNull();
  });
});

describe('R13 progress total is derived', () => {
  test('form passes the actual section count, not a hardcoded total', () => {
    const source = readSource('digital-product-form-page.tsx');
    expect(source).toContain('total={progressSections.length}');
    expect(source).toContain("const progressSections: ProductSetupSection[] = ['details', 'files', 'pricing'];");
    expect(source).not.toContain("section !== 'previews' && section !== 'bio-pages'");
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
  render(<ProductTypePicker value={null} onValueChange={() => {}} />);
}

describe('R18 limits visible in picker', () => {
  beforeEach(() => {
    useBootstrapDataStore.setState({data: null} as never);
  });

  test('digital and audio options show their server-provided format hint', () => {
    renderTypePicker();
    expect(screen.getByText('PDF, EPUB, ZIP, or TXT')).not.toBeNull();
    expect(screen.getByText('MP3, M4A, or WAV')).not.toBeNull();
  });

  test('e-book does not repeat its format hint — the description already states it', () => {
    renderTypePicker();
    expect(screen.queryByText('PDF or EPUB')).toBeNull();
    expect(
      screen.getByText('A book or comic in PDF and EPUB.'),
    ).not.toBeNull();
  });

  test('storage usage line is not part of the wizard picker', () => {
    renderTypePicker();
    expect(screen.queryByText(/storage/i)).toBeNull();
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

// The type-picker is a single transient decision. Navigating clears its selection
// instead of storing wizard billing/price data between visits.
describe('single-step selection navigation', () => {
  beforeEach(() => localStorage.clear());

  test('Continue navigates after selecting Digital product and closes the dialog', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    const {unmount} = render(<MemoryRouter><CreateProductDialog open onOpenChange={close} /></MemoryRouter>);
    await user.click(screen.getByRole('radio', {name: /digital product/i}));
    await user.click(screen.getByRole('button', {name: /continue/i}));
    expect(close).toHaveBeenCalledWith(false);
    expect(localStorage.getItem('productCreateWizard')).toBeNull();
    unmount();
    render(<MemoryRouter><CreateProductDialog open onOpenChange={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('button', {name: /continue/i}).hasAttribute('disabled')).toBe(true);
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  test('type-only selection does not introduce a price or billing step', () => {
    render(<MemoryRouter><CreateProductDialog open onOpenChange={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByText('Step 1 of 2')).toBeNull();
    expect(screen.queryByRole('radiogroup', {name: /billing/i})).toBeNull();
    expect(screen.queryByLabelText('Price')).toBeNull();
  });
});

// T7 (crit1-A P1): the card used to draw a fake check-circle at the row's end
// while the *real* radio was `sr-only` — two indicators, one of them invisible
// to everyone. The real RadioGroupItem is now the single visible indicator:
// the selected card's radio carries Base UI's `data-checked` state and is
// never sr-only, hidden, or transparent anywhere up the tree; unselected
// radios carry `data-unchecked` instead.
const RADIO_SELECTOR = '[role="radio"]';

function expectVisibleCheckedRadio(card: HTMLLabelElement) {
  const radio = card.querySelector(RADIO_SELECTOR);
  expect(radio, 'selected card renders the real radio').not.toBeNull();
  // Base UI paints the checked state from the data-checked attribute.
  expect(radio!.hasAttribute('data-checked')).toBe(true);
  // Visible: never screen-reader-only, hidden, or transparent — anywhere up
  // the tree (this is the ghost the old sr-only radio was hiding behind).
  expect(radio!.closest('.sr-only')).toBeNull();
  expect(radio!.closest('[hidden]')).toBeNull();
  expect(radio!.getAttribute('class') ?? '').not.toMatch(
    /opacity-0|invisible|\bhidden\b/,
  );
  for (
    let el = radio!.parentElement;
    el && el !== card.parentElement;
    el = el.parentElement
  ) {
    expect(el.getAttribute('class') ?? '').not.toMatch(/sr-only|opacity-0/);
    expect(el.hasAttribute('hidden')).toBe(false);
    expect(el.getAttribute('aria-hidden')).not.toBe('true');
  }
  // The checked radio paints the primary fill (data-checked:bg-primary).
  expect(radio!.className).toContain('data-checked:bg-primary');
}

describe('T7 the real radio is the visible selection indicator', () => {
  test('type picker: selected card exposes a visible checked radio, unselected cards do not', () => {
    const {container} = render(
      <ProductTypePicker value="ebook" onValueChange={() => {}} />,
    );
    const labels = labelsIn(container);
    expectVisibleCheckedRadio(labels[1]);
    for (const index of [0, 2, 3]) {
      const radio = labels[index].querySelector(RADIO_SELECTOR);
      expect(radio, 'unselected card still exposes its radio').not.toBeNull();
      expect(radio!.hasAttribute('data-checked')).toBe(false);
    }
    // No decorative twin: exactly one radio per card, no leftover glyph.
    for (const label of labels) {
      expect(label.querySelectorAll(RADIO_SELECTOR)).toHaveLength(1);
      expect(label.querySelector('[data-selection-glyph]')).toBeNull();
    }
  });

  test('billing picker: selected card exposes a visible checked radio, unselected card does not', () => {
    const {container} = render(
      <BillingModePicker value="paid" onValueChange={() => {}} />,
    );
    const labels = labelsIn(container);
    expectVisibleCheckedRadio(labels[1]);
    const unchecked = labels[0].querySelector(RADIO_SELECTOR);
    expect(unchecked).not.toBeNull();
    expect(unchecked!.hasAttribute('data-checked')).toBe(false);
  });

  test('billing picker: no radio is checked before anything is selected', () => {
    const {container} = render(
      <BillingModePicker value={null} onValueChange={() => {}} />,
    );
    for (const label of labelsIn(container)) {
      const radio = label.querySelector(RADIO_SELECTOR);
      expect(radio).not.toBeNull();
      expect(radio!.hasAttribute('data-checked')).toBe(false);
    }
  });
});

// T7 (crit1-A P1): /dashboard/items/new put the Back/Continue row above the
// question and repeated the heading. The page must ship exactly one h1 that
// names the flow ("Create product"), an h2 step question, and read
// question → body → actions, like the dialog already does.
describe('T7 page shell: single h1, question before the action row', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function renderSelectionPage() {
    const router = createMemoryRouter(
      [
        {
          path: '/dashboard/items/new',
          element: <ProductTypeSelectionPage />,
        },
      ],
      {initialEntries: ['/dashboard/items/new']},
    );
    return render(
      <DashboardLayoutContextProvider name="test">
        {() => <RouterProvider router={router} />}
      </DashboardLayoutContextProvider>,
    );
  }

  test('renders exactly one h1 and does not repeat the step question as a second heading', () => {
    const {container} = renderSelectionPage();

    const h1s = Array.from(container.querySelectorAll('h1'));
    expect(h1s).toHaveLength(1);
    // The page heading names the flow; the step title is the h2 question
    // (same vocabulary as billing/price steps), written once.
    expect(h1s[0].textContent).toBe('Create product');
    expect(
      screen.getAllByRole('heading', {name: 'What are you selling?'}),
    ).toHaveLength(1);
    expect(
      screen.getByRole('heading', {level: 2, name: 'What are you selling?'}),
    ).toBeTruthy();
  });

  test('keeps a single concise instruction and does not resurrect a stored wizard step', () => {
    localStorage.setItem('productCreateWizard', JSON.stringify({
      step: 'price', state: {type: 'digital', billing: 'paid', price: '25'},
    }));
    renderSelectionPage();
    const title = screen.getByRole('heading', {level: 2, name: 'What are you selling?'});
    expect(title.parentElement?.querySelector('p')?.textContent).toBe('Choose a type to open its editor.');
    expect(screen.queryByText('Set your price')).toBeNull();
  });

  test('the question precedes the Back and Continue actions in DOM order', () => {
    renderSelectionPage();

    const question = screen.getByRole('heading', {
      level: 2,
      name: 'What are you selling?',
    });
    const back = screen.getByRole('link', {name: /all products/i});
    const next = screen.getByRole('button', {name: /continue/i});

    const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(question.compareDocumentPosition(back) & FOLLOWING).toBeTruthy();
    expect(question.compareDocumentPosition(next) & FOLLOWING).toBeTruthy();
    // Continue sits after the option list too (footer of the column).
    expect(
      screen.getByRole('radiogroup').compareDocumentPosition(next) &
        FOLLOWING,
    ).toBeGreaterThan(0);
  });
});

describe('one-step page shell', () => {
  beforeEach(() => localStorage.clear());

  test('the picker has no misleading wizard progress and Continue requires a selected type', async () => {
    const router = createMemoryRouter(
      [{path: '/dashboard/items/new', element: <ProductTypeSelectionPage />}],
      {initialEntries: ['/dashboard/items/new']},
    );
    render(<DashboardLayoutContextProvider name="test">
      {() => <RouterProvider router={router} />}
    </DashboardLayoutContextProvider>);
    expect(screen.queryByRole('progressbar')).toBeNull();
    const next = screen.getByRole('button', {name: /continue/i});
    expect(next.hasAttribute('disabled')).toBe(true);
    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', {name: /e-book/i}));
    expect(next.hasAttribute('disabled')).toBe(false);
  });
});

// T4 (heading hierarchy): every section header used to render as h3 — the
// shared accordion's Base UI Header defaults to h3 — skipping h2 entirely
// between the page h1 and its top-level section content. Both flow pages
// share ProductFormSection, so one fix covers them; both are mounted here
// because the Produces contract names both routes.
describe('T4 heading hierarchy: sections are h2 under the page h1', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /**
   * The invariant both pages must satisfy: exactly one h1 (the page title),
   * section triggers as the h2s right under it, and no skipped levels
   * anywhere (h3+ only ever follows h2 — e.g. the shared ProductCard title
   * in the edit page's preview aside, which keeps its app-wide h3 default).
   */
  function expectHeadingHierarchy() {
    const headings = screen.getAllByRole('heading');

    // Exactly one h1 — the page title — and it is the FIRST heading.
    const h1s = headings.filter(h => h.tagName === 'H1');
    expect(h1s).toHaveLength(1);
    expect(headings[0]).toBe(h1s[0]);

    // The first heading after h1 is an h2 (never h3 — that skipped h2).
    expect(headings[1].tagName).toBe('H2');

    const sections = headings.filter(h => h.tagName === 'H2');
    expect(sections.length).toBeGreaterThan(0);

    // No skipped levels anywhere on the page: a heading may only drop to the
    // level directly below the previous one.
    const levels = headings.map(h => Number(h.tagName.slice(1)));
    levels.forEach((level, index) => {
      if (index > 0) {
        expect(level - levels[index - 1]).toBeLessThanOrEqual(1);
      }
    });

    return {h1: h1s[0], sections};
  }

  test('course setup page (/dashboard/items/new/course) renders h1 → h2 sections', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/dashboard/items/new/course',
          element: <CreateCoursePage />,
        },
      ],
      {initialEntries: ['/dashboard/items/new/course']},
    );
    render(
      <DashboardLayoutContextProvider name="test">
        {() => <RouterProvider router={router} />}
      </DashboardLayoutContextProvider>,
    );

    const {h1, sections} = expectHeadingHierarchy();
    expect(h1.textContent).toContain('Create course');
    // The section triggers ARE the h2 headings, titled per section.
    expect(sections.map(h => h.textContent)).toEqual([
      expect.stringContaining('Course details'),
      expect.stringContaining('Course settings'),
    ]);
  });

  test('digital product edit page (/dashboard/items/:id/edit) renders h1 → h2 sections', async () => {
    const router = createMemoryRouter(
      [
        {
          path: '/dashboard/items/:productId/edit',
          element: <DigitalProductEditPage />,
        },
      ],
      {initialEntries: ['/dashboard/items/1/edit']},
    );
    const queryClient = new QueryClient({
      defaultOptions: {queries: {retry: false}},
    });
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardLayoutContextProvider name="test">
          {() => <RouterProvider router={router} />}
        </DashboardLayoutContextProvider>
      </QueryClientProvider>,
    );

    // All five sections remain mounted, but only the active stage is visible
    // and included in the accessibility tree.
    const sections = await screen.findAllByRole('heading', {level: 2});
    expect(sections).toHaveLength(1);
    expect(sections[0].textContent).toContain('Product details');
    expect(document.querySelectorAll('[data-slot="product-editor-section"]')).toHaveLength(5);

    const {h1} = expectHeadingHierarchy();
    expect(h1.textContent).toContain('Edit digital product');
    const filesStep = screen.getByRole('button', {name: 'Files & sample, step 2 of 4'});
    fireEvent.click(filesStep);
    expect(screen.getAllByRole('heading', {level: 2}).map(h => h.textContent)).toEqual([
      expect.stringContaining('Files buyers receive'),
      expect.stringContaining('Sample PDF'),
    ]);
    expect(screen.queryByRole('heading', {name: 'Product details'})).toBeNull();

  });
});


describe('UX-35 Course Builder heading semantics', () => {
  test('renders a real h1 during load and after course data hydrates', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/courses/course-builder-page.tsx'),
      'utf8',
    );
    const headings = source.match(/<DashboardLayout\.SectionTitle\s+render={<h1 \/>}[^>]*>/g);
    expect(headings).toHaveLength(2);
    // Both loading and ready states must retain mobile reflow styling.
    for (const heading of headings ?? []) {
      expect(heading).toContain('max-lg:basis-full');
      expect(heading).toContain('max-lg:whitespace-normal');
    }
    expect(source).toContain('message="Course Builder"');
  });
});
