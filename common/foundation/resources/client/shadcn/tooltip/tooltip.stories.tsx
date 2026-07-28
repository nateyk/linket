import {Button} from '@shadcn/button/button';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import preview from '@storybook/preview';

const meta = preview.meta({
  title: 'Tooltip',
  component: Tooltip.Root,
  tags: ['autodocs'],
});

export const Basic = meta.story({
  decorators: [
    Story => (
      <Tooltip.Provider>
        <Story />
      </Tooltip.Provider>
    ),
  ],
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Tooltip.Root>
        <Tooltip.Trigger render={<Button variant="outline">Hover</Button>} />
        <Tooltip.Content>
          <p>Add to library</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </div>
  ),
});

export const TooltipSides = meta.story(() => {
  return (
    <div className="flex flex-wrap gap-2">
      {(['left', 'top', 'bottom', 'right'] as const).map(side => (
        <Tooltip.Root key={side}>
          <Tooltip.Trigger
            render={
              <Button variant="outline" className="w-fit capitalize">
                {side}
              </Button>
            }
          />
          <Tooltip.Content side={side}>
            <p>Add to library</p>
          </Tooltip.Content>
        </Tooltip.Root>
      ))}
    </div>
  );
});

export const TooltipDisabledButton = meta.story(() => {
  return (
    <>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <span className="inline-block w-fit">
              <Button variant="outline" disabled>
                Disabled
              </Button>
            </span>
          }
        />
        <Tooltip.Content>
          <p>This feature is currently unavailable</p>
        </Tooltip.Content>
      </Tooltip.Root>
    </>
  );
});
