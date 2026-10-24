import {Label} from '@shadcn/forms/label';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect} from 'storybook/test';

const meta = {
  component: Label,
  tags: ['ai-generated'],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Email address',
    htmlFor: 'email',
  },
  play: async ({canvas, args}) => {
    const label = canvas.getByText(String(args.children));
    await expect(label).toHaveAttribute('for', 'email');
  },
};

export const Required: Story = {
  args: {
    children: (
      <>
        Password <span className="text-destructive">*</span>
      </>
    ),
  },
};
