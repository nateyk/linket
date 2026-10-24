import {Kbd, KbdGroup} from '@shadcn/kbd';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect} from 'storybook/test';

const meta = {
  component: Kbd,
  tags: ['ai-generated'],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: '⌘',
  },
  play: async ({canvas}) => {
    await expect(canvas.getByText('⌘')).toHaveAttribute('data-slot', 'kbd');
  },
};

export const KeyCombo: Story = {
  render: () => (
    <KbdGroup>
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  ),
};

export const Escape: Story = {
  args: {
    children: 'Esc',
  },
};
