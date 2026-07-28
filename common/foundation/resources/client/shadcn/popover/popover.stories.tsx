import {Button} from '@shadcn/button/button';
import {Input} from '@shadcn/forms/input/input';
import {Label} from '@shadcn/forms/label';
import {Popover} from '@shadcn/popover/popover';
import preview from '@storybook/preview';

const meta = preview.meta({
  title: 'Popover',
  component: Popover.Root,
  tags: ['autodocs'],
});

export const Basic = meta.story(() => {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={<Button variant="outline">Open popover</Button>}
      />
      <Popover.Portal>
        <Popover.Content className="w-80">
          <div className="grid gap-4">
            <Popover.Header>
              <Popover.Title>Dimensions</Popover.Title>
              <Popover.Description>
                Set the dimensions for the layer.
              </Popover.Description>
            </Popover.Header>
            <div className="grid gap-2">
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  defaultValue="100%"
                  className="col-span-2 h-8"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="maxWidth">Max. width</Label>
                <Input
                  id="maxWidth"
                  defaultValue="300px"
                  className="col-span-2 h-8"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  defaultValue="25px"
                  className="col-span-2 h-8"
                />
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <Label htmlFor="maxHeight">Max. height</Label>
                <Input
                  id="maxHeight"
                  defaultValue="none"
                  className="col-span-2 h-8"
                />
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});

/**
 * Use the `align` prop on `Popover.Content` to control the horizontal alignment.
 */
export const Align = meta.story(() => {
  return (
    <>
      <div className="flex gap-6">
        <Popover.Root>
          <Popover.Trigger
            render={
              <Button variant="outline" size="sm">
                Start
              </Button>
            }
          />
          <Popover.Portal>
            <Popover.Content align="start" className="w-40">
              Aligned to start
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <Popover.Root>
          <Popover.Trigger
            render={
              <Button variant="outline" size="sm">
                Center
              </Button>
            }
          />
          <Popover.Portal>
            <Popover.Content align="center" className="w-40">
              Aligned to center
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <Popover.Root>
          <Popover.Trigger
            render={
              <Button variant="outline" size="sm">
                End
              </Button>
            }
          />
          <Popover.Portal>
            <Popover.Content align="end" className="w-40">
              Aligned to end
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </>
  );
});

/**
 * Use the `openOnHover` prop on `Popover.Trigger` to open the popover when the user hovers over the trigger.
 */
export const OpenOnHover = meta.story(() => {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        delay={100}
        render={<Button variant="outline">Open popover</Button>}
      />
      <Popover.Portal>
        <Popover.Content className="w-80">Popover content</Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});
