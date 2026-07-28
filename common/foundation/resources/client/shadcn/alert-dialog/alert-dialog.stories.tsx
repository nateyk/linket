import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import preview from '@storybook/preview';
import {BluetoothIcon, CircleFadingPlusIcon} from 'lucide-react';
import {useState} from 'react';

const meta = preview.meta({
  title: 'Alert Dialog',
  component: AlertDialog.Root,
  tags: ['autodocs'],
});

export const Default = meta.story({
  render: () => (
    <AlertDialog.Root>
      <AlertDialog.Trigger
        render={<Button variant="outline">Show Dialog</Button>}
      />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
            <AlertDialog.Description>
              This action cannot be undone. This will permanently delete your
              account from our servers.
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action color="danger">Continue</AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  ),
});

export const AlertDialogSmall = meta.story(() => {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger
        render={<Button variant="outline">Show Dialog</Button>}
      />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>Allow accessory to connect?</AlertDialog.Title>
            <AlertDialog.Description>
              Do you want to allow the USB accessory to connect to this device?
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Don&apos;t allow</AlertDialog.Cancel>
            <AlertDialog.Action>Allow</AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
});

export const AlertDialogWithMedia = meta.story(() => {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger
        render={<Button variant="outline">Share Project</Button>}
      />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content>
          <AlertDialog.Header>
            <AlertDialog.Media>
              <CircleFadingPlusIcon />
            </AlertDialog.Media>
            <AlertDialog.Title>Share this project?</AlertDialog.Title>
            <AlertDialog.Description>
              Anyone with the link will be able to view and edit this project.
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action>Share</AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
});

export const AlertDialogSmallWithMedia = meta.story(() => {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger
        render={<Button variant="outline">Show Dialog</Button>}
      />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Media>
              <BluetoothIcon />
            </AlertDialog.Media>
            <AlertDialog.Title>Allow accessory to connect?</AlertDialog.Title>
            <AlertDialog.Description>
              Do you want to allow the USB accessory to connect to this device?
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>Don&apos;t allow</AlertDialog.Cancel>
            <AlertDialog.Action>Allow</AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
});

const handle = AlertDialog.createHandle<{userId: number}>();

export const AlertDialogWithDetachedTrigger = meta.story(() => {
  const [open, setOpen] = useState(false);

  const dialog = (
    <AlertDialog.Root<{userId: number}>
      handle={handle}
      open={open}
      onOpenChange={setOpen}
    >
      {({payload}) => (
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
              <AlertDialog.Description>
                Are you sure you want to delete user {payload?.userId}?
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action>Continue</AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      )}
    </AlertDialog.Root>
  );

  return (
    <div className="flex gap-2">
      <AlertDialog.Trigger
        render={<Button>Delete user 1</Button>}
        handle={handle}
        payload={{userId: 1}}
      />
      <AlertDialog.Trigger
        render={<Button>Delete user 2</Button>}
        handle={handle}
        payload={{userId: 2}}
      />
      {dialog}
    </div>
  );
});
