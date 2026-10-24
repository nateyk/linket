import {Separator} from '@shadcn/separator';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect} from 'storybook/test';

const meta = {
  component: Separator,
  tags: ['ai-generated'],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
  decorators: [
    Story => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
  play: async ({canvas}) => {
    const separator = canvas.getByRole('separator');
    await expect(separator).toHaveAttribute('data-orientation', 'horizontal');
  },
};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
  decorators: [
    Story => (
      <div className="flex h-16 items-center">
        <Story />
      </div>
    ),
  ],
};

/** Proves shared preview loaded Tailwind / global CSS (`h-px` → 1px). */
export const CssCheck: Story = {
  args: {
    orientation: 'horizontal',
  },
  decorators: [
    Story => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
  play: async ({canvas}) => {
    const separator = canvas.getByRole('separator');
    await expect(getComputedStyle(separator).height).toBe('1px');
  },
};
