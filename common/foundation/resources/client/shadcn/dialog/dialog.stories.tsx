import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import preview from '@storybook/preview';
import {Trans} from '@ui/i18n/trans';
import {Dialog} from './dialog';

const meta = preview.meta({
  title: 'Dialog',
  component: Dialog.Root,
  subcomponents: {
    Trigger: Dialog.Trigger,
    Portal: Dialog.Portal,
    Backdrop: Dialog.Backdrop,
    Content: Dialog.Content,
    Header: Dialog.Header,
    Body: Dialog.Body,
    Footer: Dialog.Footer,
    CloseButton: Dialog.CloseButton,
    Title: Dialog.Title,
    Description: Dialog.Description,
  },
});

const loremParagraph =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

export const Default = meta.story({
  render: () => (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="outline" />}>
        <Trans message="Open Dialog" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <form>
          <Dialog.Content className="sm:max-w-sm">
            <Dialog.Header>
              <Dialog.Title>
                <Trans message="Edit profile" />
              </Dialog.Title>
              <Dialog.Description>
                <Trans message="Make changes to your profile here. Click save when you're done." />
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
              <Field.Group>
                <Field.Root name="name">
                  <Field.Label>
                    <Trans message="Name" />
                  </Field.Label>
                  <Input defaultValue="Pedro Duarte" />
                  <Field.Error />
                </Field.Root>
                <Field.Root name="gender">
                  <Field.Label>
                    <Trans message="Gender" />
                  </Field.Label>
                  <Select.Root>
                    <Select.Trigger>
                      <Select.Value />
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="male">
                        <Trans message="Male" />
                      </Select.Item>
                      <Select.Item value="female">
                        <Trans message="Female" />
                      </Select.Item>
                      <Select.Item value="other">
                        <Trans message="Other" />
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                  <Field.Error />
                </Field.Root>
              </Field.Group>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseButton>
                <Trans message="Cancel" />
              </Dialog.CloseButton>
              <Button type="submit">
                <Trans message="Save changes" />
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </form>
      </Dialog.Portal>
    </Dialog.Root>
  ),
});

export const DialogWithLongContent = meta.story({
  render: () => (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="outline" />}>
        <Trans message="Open" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Title" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="This dialog has a lot of body text and showcases scrolling behavior." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            {Array.from({length: 10}).map((_, index) => (
              <p key={index} className="mb-4 leading-normal">
                <Trans message={loremParagraph} />
              </p>
            ))}
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.CloseButton>
              <Trans message="Close" />
            </Dialog.CloseButton>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  ),
});

export const NestedDialog = meta.story({
  render: () => (
    <Dialog.Root>
      <Dialog.Trigger render={<Button variant="outline" />}>
        <Trans message="Open" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Parent dialog" />
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Dialog.Root>
              <Dialog.Trigger render={<Button variant="outline" />}>
                <Trans message="Open nested dialog" />
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Backdrop />
                <Dialog.Content>
                  <Dialog.Header>
                    <Dialog.Title>
                      <Trans message="Nested dialog" />
                    </Dialog.Title>
                  </Dialog.Header>
                  <Dialog.Body className="min-h-10">
                    <Trans message="This is a nested dialog." />
                  </Dialog.Body>
                  <Dialog.Footer>
                    <Dialog.CloseButton>
                      <Trans message="Close" />
                    </Dialog.CloseButton>
                  </Dialog.Footer>
                </Dialog.Content>
                <Dialog.Portal />
              </Dialog.Portal>
            </Dialog.Root>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.CloseButton>
              <Trans message="Close" />
            </Dialog.CloseButton>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  ),
});
