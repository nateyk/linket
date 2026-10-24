import {Toggle} from '@shadcn/toggle';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {BoldIcon} from 'lucide-react';
import {expect} from 'storybook/test';

const meta = {
  component: Toggle,
  tags: ['ai-generated'],
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Bold',
    'aria-label': 'Toggle bold',
  },
  play: async ({canvas, userEvent}) => {
    const toggle = canvas.getByRole('button', {name: /toggle bold/i});
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  },
};

export const WithIcon: Story = {
  args: {
    'aria-label': 'Toggle bold',
    children: <BoldIcon />,
  },
};

export const Pressed: Story = {
  args: {
    defaultPressed: true,
    children: 'Italic',
    'aria-label': 'Toggle italic',
  },
};
