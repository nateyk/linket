import {MenuToggleIcon} from '@shadcn/menu-toggle-icon/menu-toggle-icon';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect} from 'storybook/test';

const meta = {
  component: MenuToggleIcon,
  tags: ['ai-generated'],
} satisfies Meta<typeof MenuToggleIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {
  args: {
    open: false,
  },
  play: async ({canvasElement, args}) => {
    const wrapper = canvasElement.querySelector('.relative');
    await expect(wrapper).toBeTruthy();
    await expect(args.open).toBe(false);
  },
};

export const Open: Story = {
  args: {
    open: true,
  },
};

export const SlowTransition: Story = {
  args: {
    open: false,
    duration: 600,
  },
};
