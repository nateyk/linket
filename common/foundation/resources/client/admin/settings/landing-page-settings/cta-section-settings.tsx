import {MenuItemForm} from '@common/admin/menus/menu-item-form';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {Button} from '@shadcn/button/button';
import {Drawer} from '@shadcn/drawer/drawer';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {ChevronRight, PlusIcon} from 'lucide-react';
import {useFieldArray, useWatch} from 'react-hook-form';

const buttonVariantOptions = [
  {value: 'default', label: <Trans message="Default" />},
  {value: 'outline', label: <Trans message="Outline" />},
  {value: 'ghost', label: <Trans message="Ghost" />},
  {value: 'link', label: <Trans message="Link" />},
] as const;

const buttonColorOptions = [
  {value: 'default', label: <Trans message="Default" />},
  {value: 'primary', label: <Trans message="Primary" />},
  {value: 'danger', label: <Trans message="Danger" />},
  {value: 'positive', label: <Trans message="Positive" />},
  {value: 'white', label: <Trans message="White" />},
] as const;

type Props = {
  index: number;
};
export function CtaSectionSettings({index}: Props) {
  const prefix =
    `client.landingPage.sections.${index}` as `client.landingPage.sections.${number}`;
  const buttons = useFieldArray<AdminSettings>({
    name: `${prefix}.buttons`,
  });
  return (
    <Field.Group>
      <HookForm.Field name={`${prefix}.title`}>
        <Field.Label>
          <Trans message="Title" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name={`${prefix}.description`}>
        <Field.Label>
          <Trans message="Description" />
        </Field.Label>
        <Textarea />
        <Field.Error />
      </HookForm.Field>

      <Field.Separator />

      <div className="flex flex-col gap-2">
        <Field.Title>
          <Trans message="Buttons" />
        </Field.Title>
        {buttons.fields.map((button, buttonIndex) => (
          <Drawer.Root key={button.id} position="right">
            <Drawer.Trigger
              render={
                <Button variant="outline" className="w-full justify-between" />
              }
            >
              <ButtonName
                index={buttonIndex}
                formPathPrefix={`${prefix}.buttons`}
              />
              <ChevronRight
                className="text-muted-foreground"
                data-icon="inline-end"
              />
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Backdrop />
              <Drawer.Content>
                <Drawer.Header className="flex-row items-center justify-between gap-4">
                  <Drawer.Title>
                    <ButtonName
                      index={buttonIndex}
                      formPathPrefix={`${prefix}.buttons`}
                    />
                  </Drawer.Title>
                  <Drawer.Close
                    render={
                      <Button type="button" variant="outline" size="sm" />
                    }
                  >
                    <Trans message="Save & close" />
                  </Drawer.Close>
                </Drawer.Header>
                <Drawer.Body>
                  <EditButtonForm
                    formPathPrefix={`${prefix}.buttons.${buttonIndex}`}
                  />
                </Drawer.Body>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        ))}

        <Button
          type="button"
          variant="outline"
          color="primary"
          size="sm"
          className="w-max"
          onClick={() => {
            buttons.append({
              color: 'primary',
              variant: 'flat',
            });
          }}
        >
          <PlusIcon />
          <Trans message="Add button" />
        </Button>
      </div>

      <Field.Separator />

      <HookForm.Field name={`${prefix}.forceDarkMode`}>
        <Field.Label>
          <Switch />
          <Trans message="Always use dark mode" />
        </Field.Label>
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}

type ButtonNameProps = {
  index: number;
  formPathPrefix: string;
};
function ButtonName({index, formPathPrefix}: ButtonNameProps) {
  const title = useWatch({
    name: `${formPathPrefix}.${index}.label`,
  });
  return (
    title || <Trans message="Button :number" values={{number: index + 1}} />
  );
}

interface EditButtonFormProps {
  formPathPrefix: string;
}
function EditButtonForm({formPathPrefix}: EditButtonFormProps) {
  return (
    <MenuItemForm formPathPrefix={formPathPrefix}>
      <HookForm.Field name={`${formPathPrefix}.variant`}>
        <Field.Label>
          <Trans message="Button variant" />
        </Field.Label>
        <Select.Root items={buttonVariantOptions}>
          <Select.Trigger className="w-full">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {buttonVariantOptions.map(option => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>
      <HookForm.Field name={`${formPathPrefix}.color`}>
        <Field.Label>
          <Trans message="Button color" />
        </Field.Label>
        <Select.Root items={buttonColorOptions}>
          <Select.Trigger className="w-full">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {buttonColorOptions.map(option => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>
    </MenuItemForm>
  );
}
