import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect} from 'storybook/test';
import {DigitalProductEditor} from './digital-product-editor';
import {EbookEditor} from './ebook-editor';
import {AudioEditor} from './audio-editor';

type Kind = 'digital' | 'ebook' | 'audio';

function ResponsiveEditorFixture({
  kind,
  width,
}: {
  kind: Kind;
  width: number;
}) {
  const slots = {
    details: (
      <div className="flex min-w-0 flex-col gap-3">
        <label htmlFor="sample-editor-title" className="text-sm font-medium">
          Product title
        </label>
        <input
          id="sample-editor-title"
          className="w-full min-w-0 rounded-input border border-border px-3 py-2"
          defaultValue="An introductory guide for Ethiopian creators"
        />
        <p className="text-sm text-muted-foreground">
          Create a useful resource with a descriptive title and cover image.
        </p>
      </div>
    ),
    files: (
      <div className="flex min-w-0 items-center gap-3 rounded-card-sm border border-border p-3">
        <span className="min-w-0 flex-1 truncate text-sm">
          introductory-business-guide-and-extra-downloadable-templates.pdf
        </span>
        <button type="button" className="shrink-0 rounded-input border border-border px-3 py-2 text-sm">
          Remove
        </button>
      </div>
    ),
    sample: (
      <p className="text-sm text-muted-foreground">
        Preview content is optional and remains separate from private files.
      </p>
    ),
    pricing: (
      <div className="flex min-w-0 flex-wrap gap-2">
        <label className="rounded-input border border-border p-2 text-sm">
          <input type="radio" name="demo-price" defaultChecked /> Free access
        </label>
        <label className="rounded-input border border-border p-2 text-sm">
          <input type="radio" name="demo-price" /> Paid
        </label>
      </div>
    ),
    storefront: (
      <p className="text-sm text-muted-foreground">
        Storefront placement is optional.
      </p>
    ),
  };

  return (
    <div
      data-testid="editor-viewport"
      style={{width, maxWidth: '100%', boxSizing: 'border-box'}}
    >
      {kind === 'digital' ? (
        <DigitalProductEditor {...slots} />
      ) : kind === 'ebook' ? (
        <EbookEditor {...slots} />
      ) : (
        <AudioEditor {...slots} />
      )}
    </div>
  );
}

const meta = {
  title: 'Product Creation/Responsive Editor QA',
  component: ResponsiveEditorFixture,
  tags: ['ai-generated'],
  args: {kind: 'digital', width: 360},
} satisfies Meta<typeof ResponsiveEditorFixture>;
export default meta;
type Story = StoryObj<typeof meta>;

async function verifyResponsiveFrame({canvas}: {canvas: any}) {
  const frame = canvas.getByTestId('editor-viewport') as HTMLElement;
  await expect(frame).toBeVisible();
  await expect(canvas.getAllByRole('region')).toHaveLength(5);
  // Measured by Chromium within the story, not inferred from Tailwind classes.
  if (frame.scrollWidth > frame.clientWidth + 1) {
    throw new Error(
      `Editor component overflow: ${frame.scrollWidth}px content vs ${frame.clientWidth}px frame`,
    );
  }
}

export const Digital360: Story = {args: {kind: 'digital', width: 360}, play: verifyResponsiveFrame};
export const Digital768: Story = {args: {kind: 'digital', width: 768}, play: verifyResponsiveFrame};
export const Digital1440: Story = {args: {kind: 'digital', width: 1440}, play: verifyResponsiveFrame};
export const Ebook360: Story = {args: {kind: 'ebook', width: 360}, play: verifyResponsiveFrame};
export const Ebook768: Story = {args: {kind: 'ebook', width: 768}, play: verifyResponsiveFrame};
export const Ebook1440: Story = {args: {kind: 'ebook', width: 1440}, play: verifyResponsiveFrame};
export const Audio360: Story = {args: {kind: 'audio', width: 360}, play: verifyResponsiveFrame};
export const Audio768: Story = {args: {kind: 'audio', width: 768}, play: verifyResponsiveFrame};
export const Audio1440: Story = {args: {kind: 'audio', width: 1440}, play: verifyResponsiveFrame};
