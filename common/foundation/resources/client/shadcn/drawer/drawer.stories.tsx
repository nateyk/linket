import {Button} from '@shadcn/button/button';
import {Drawer} from '@shadcn/drawer/drawer';
import preview from '@storybook/preview';

const meta = preview.meta({
  title: 'Drawer',
  component: Drawer.Root,
  tags: ['autodocs'],
});

export const DefaultExample = meta.story(() => {
  const content = (
    <Drawer.Content>
      <Drawer.Header>
        <Drawer.Title>Are you absolutely sure?</Drawer.Title>
        <Drawer.Description>This action cannot be undone.</Drawer.Description>
      </Drawer.Header>
      <Drawer.Body>Testing</Drawer.Body>
      <Drawer.Footer>
        <Button>Submit</Button>
        <Drawer.Close render={<Button variant="outline" />}>
          Cancel
        </Drawer.Close>
      </Drawer.Footer>
    </Drawer.Content>
  );
  return (
    <div className="flex gap-2">
      <Drawer.Root position="right">
        <Drawer.Trigger render={<Button />}>Open right</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          {content}
        </Drawer.Portal>
      </Drawer.Root>
      <Drawer.Root position="bottom">
        <Drawer.Trigger render={<Button />}>Open bottom</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          {content}
        </Drawer.Portal>
      </Drawer.Root>
      <Drawer.Root position="left">
        <Drawer.Trigger render={<Button />}>Open left</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          {content}
        </Drawer.Portal>
      </Drawer.Root>
      <Drawer.Root position="top">
        <Drawer.Trigger render={<Button />}>Open top</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Backdrop />
          {content}
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
});

export const ScrollableBody = meta.story(() => {
  return (
    <Drawer.Root position="right">
      <Drawer.Trigger render={<Button />}>Open right</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Are you absolutely sure?</Drawer.Title>
            <Drawer.Description>
              This action cannot be undone.
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body>
            {Array.from({length: 10}).map((_, index) => (
              <p key={index} className="mb-4 leading-normal">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            ))}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
});
