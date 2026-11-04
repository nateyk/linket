import {Button} from '@shadcn/button/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@shadcn/sheet/sheet';
import type {Meta, StoryObj} from '@storybook/react-vite';
import {expect, waitFor, within} from 'storybook/test';

const meta = {
  component: Sheet,
  tags: ['ai-generated'],
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Right: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button />}>Open sheet</SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Account settings</SheetTitle>
        </SheetHeader>
        <p className="text-sm text-muted-foreground">
          Update your profile and preferences.
        </p>
      </SheetContent>
    </Sheet>
  ),
  play: async ({canvas, userEvent, canvasElement}) => {
    await userEvent.click(canvas.getByRole('button', {name: /open sheet/i}));
    const body = within(canvasElement.ownerDocument.body);
    // The Base UI sheet mounts the heading before its opening transition
    // completes. Retry the visibility assertion rather than racing it.
    await waitFor(
      () =>
        expect(body.getByRole('heading', {name: /account settings/i})).toBeVisible(),
      {timeout: 3000},
    );
  },
};

export const Left: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button />}>Open left</SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};

export const Bottom: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger render={<Button />}>Open bottom</SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};
