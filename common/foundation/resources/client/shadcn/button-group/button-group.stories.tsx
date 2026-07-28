import {ButtonGroup} from '@shadcn/button-group/button-group';
import {Button, SeparatorInsideButton} from '@shadcn/button/button';
import preview from '@storybook/preview';
import {LayoutGridIcon, LayoutListIcon, PlusIcon} from 'lucide-react';

const meta = preview.meta({
  title: 'Button Group',
  component: ButtonGroup.Root,
  subcomponents: {
    ButtonGroupSeparator: ButtonGroup.Separator,
    ButtonGroupText: ButtonGroup.Text,
  },
});

const colors = ['default', 'primary', 'danger', 'positive'] as const;

export const Default = meta.story({
  render: () => (
    <ButtonGroup.Root>
      <Button variant="outline" color="default">
        First
      </Button>
      <Button variant="outline" color="default">
        Second
      </Button>
      <Button variant="outline" color="default">
        Third
      </Button>
      <Button
        variant="outline"
        color="default"
        size="icon"
        aria-label="Add item"
      >
        <PlusIcon />
      </Button>
    </ButtonGroup.Root>
  ),
});

export const WithSeparatorInsideButton = meta.story({
  render: () => (
    <div className="flex flex-col gap-3">
      {colors.map(color => (
        <ButtonGroup.Root key={color}>
          <Button variant="default" color={color}>
            Left
          </Button>
          <Button variant="default" color={color}>
            <SeparatorInsideButton />
            Right
          </Button>
        </ButtonGroup.Root>
      ))}
    </div>
  ),
});

export const WithSeparatorInButtonGroup = meta.story({
  render: () => (
    <div className="flex flex-col gap-3">
      {colors.map(color => (
        <ButtonGroup.Root key={color}>
          <Button variant="default" color={color}>
            Left
          </Button>
          <ButtonGroup.Separator />
          <Button variant="default" color={color}>
            Right
          </Button>
        </ButtonGroup.Root>
      ))}
    </div>
  ),
});

export const SegmentedButtonGroup = meta.story({
  render: () => (
    <ButtonGroup.Root variant="segmented">
      <Button variant="default" color="default">
        <LayoutListIcon />
      </Button>
      <Button variant="ghost" color="default">
        <LayoutGridIcon />
      </Button>
    </ButtonGroup.Root>
  ),
});
