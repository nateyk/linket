import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect} from 'storybook/test';
import {ProductCard} from './product-card';

type Scenario = 'published' | 'carousel' | 'multilingual-quote';

function cover(color: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><rect width="960" height="540" fill="${color}"/><text x="480" y="270" fill="white" font-family="sans-serif" font-size="52" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const PRIMARY = cover('#294f70', 'Linket');
const SECONDARY = cover('#39705c', 'Course');
const TERTIARY = cover('#805645', 'Audio');

const longTitle =
  'የንግድ መለያ ንድፍ እና BrandIdentityCompletePackage'.repeat(6);
const longDescription =
  'ለፈጣሪዎች የተዘጋጀ ሙሉ መመሪያ። ' +
  'UnbrokenMultilingualSupportingDescriptionAndFeatureNames'.repeat(5);

function ResponsiveProductCardFixture({
  width,
  scenario,
}: {
  width: number;
  scenario: Scenario;
}) {
  const isQuote = scenario === 'multilingual-quote';
  const isCarousel = scenario === 'carousel';
  const title = isQuote ? longTitle : 'Digital creator starter kit';

  return (
    <div
      data-testid="sf12-card-frame"
      style={{width, maxWidth: '100%', boxSizing: 'border-box'}}
    >
      <ProductCard
        images={isQuote ? [] : isCarousel ? [PRIMARY, SECONDARY, TERTIARY] : [PRIMARY]}
        title={title}
        titleHref="#sf12-product"
        description={isQuote ? longDescription : 'Tools and templates for the next project.'}
        tags={isCarousel ? ['Digital', 'Featured'] : []}
        topRated={isCarousel}
        price={isQuote ? 'Request a quote' : 'ETB 299'}
        action={
          <a
            href="#sf12-product"
            aria-label={`View ${title}`}
            className="inline-flex min-h-11 items-center rounded-button border border-border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            View
          </a>
        }
        quiet
      />
    </div>
  );
}

const meta = {
  title: 'Storefront/SF-12 Product Card Responsive QA',
  component: ResponsiveProductCardFixture,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof ResponsiveProductCardFixture>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Storybook Vitest runs these in a real browser. The fixture limits the card's
 * CSS width without requiring a published store or any buyer credentials.
 * This is a component reflow check, not browser-toolbar zoom or SR sign-off.
 */
const verifyCard: NonNullable<Story['play']> = async ({
  canvas,
  userEvent,
  args,
}) => {
  const frame = canvas.getByTestId('sf12-card-frame') as HTMLElement;
  await expect(frame).toBeVisible();

  const card = frame.firstElementChild as HTMLElement;
  await expect(card).toBeVisible();
  if (frame.scrollWidth > frame.clientWidth + 1) {
    throw new Error(
      `SF-12 card overflow at ${args.width}px: ${frame.scrollWidth} vs ${frame.clientWidth}`,
    );
  }

  const heading = canvas.getByRole('heading', {level: 3});
  const view = canvas.getByRole('link', {name: /^View /});
  await expect(view).toHaveAttribute('href', '#sf12-product');
  await expect(heading.querySelector('a')!).toHaveAttribute('href', '#sf12-product');

  const nameStyles = getComputedStyle(heading);
  await expect(nameStyles.overflowWrap).toMatch(/^(anywhere|break-word)$/);

  const summary = card.querySelector('p');
  if (!summary) throw new Error('Expected a supporting description');
  await expect(getComputedStyle(summary).overflowWrap).toMatch(
    /^(anywhere|break-word)$/,
  );

  if (args.scenario === 'carousel') {
    const next = canvas.getByRole('button', {name: 'Next image'});
    const previous = canvas.getByRole('button', {name: 'Previous image'});
    const first = canvas.getByRole('button', {name: 'Go to image 1'});
    const second = canvas.getByRole('button', {name: 'Go to image 2'});
    await expect(first).toHaveAttribute('aria-current', 'true');
    next.focus();
    await expect(next).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(second).toHaveAttribute('aria-current', 'true');
    await userEvent.click(previous);
    await expect(first).toHaveAttribute('aria-current', 'true');
  } else {
    await expect(canvas.queryByRole('button', {name: 'Next image'})).not.toBeInTheDocument();
  }
};

export const Published320: Story = {
  args: {width: 320, scenario: 'published'},
  play: verifyCard,
};
export const Published360: Story = {
  args: {width: 360, scenario: 'published'},
  play: verifyCard,
};
export const Published375: Story = {
  args: {width: 375, scenario: 'published'},
  play: verifyCard,
};
export const Published430: Story = {
  args: {width: 430, scenario: 'published'},
  play: verifyCard,
};
export const Published768: Story = {
  args: {width: 768, scenario: 'published'},
  play: verifyCard,
};
export const Published1024: Story = {
  args: {width: 1024, scenario: 'published'},
  play: verifyCard,
};
export const Published1440: Story = {
  args: {width: 1440, scenario: 'published'},
  play: verifyCard,
};
export const Carousel360: Story = {
  args: {width: 360, scenario: 'carousel'},
  play: verifyCard,
};
export const Carousel430: Story = {
  args: {width: 430, scenario: 'carousel'},
  play: verifyCard,
};
export const LongMixedScript320: Story = {
  args: {width: 320, scenario: 'multilingual-quote'},
  play: verifyCard,
};
export const LongMixedScript375: Story = {
  args: {width: 375, scenario: 'multilingual-quote'},
  play: verifyCard,
};
export const LongMixedScript768: Story = {
  args: {width: 768, scenario: 'multilingual-quote'},
  play: verifyCard,
};
