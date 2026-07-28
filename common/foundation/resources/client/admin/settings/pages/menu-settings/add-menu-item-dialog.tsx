import {MenuItemForm} from '@common/admin/menus/menu-item-form';
import {MenuItemConfig} from '@common/menus/menu-config';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Trans} from '@ui/i18n/trans';
import {nanoid} from 'nanoid';
import {ReactElement, ReactNode} from 'react';
import {useForm} from 'react-hook-form';

interface AddMenuItemDialogProps {
  onAdd: (item: MenuItemConfig) => void;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  children: ReactNode;
  title: ReactElement;
}
export function AddMenuItemDialog({
  onAdd,
  open: propsOpen,
  setOpen: propsSetOpen,
  children,
  title,
}: AddMenuItemDialogProps) {
  const [open, setOpen] = useControlledState(propsOpen, false, propsSetOpen);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Content
          onAdd={value => {
            onAdd(value);
            setOpen(false);
          }}
          title={title}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Content({
  onAdd,
  title,
}: Pick<AddMenuItemDialogProps, 'onAdd' | 'title'>) {
  const form = useForm<MenuItemConfig>({
    defaultValues: {
      id: nanoid(6),
      type: 'link',
      target: '_blank',
      order: 0,
    },
  });

  return (
    <HookForm.Root form={form} className="contents" onSubmit={onAdd}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{title}</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <MenuItemForm hideRoleAndPermissionFields />
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" color="primary">
            <Trans message="Add" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}
