import {MenuItemForm} from '@common/admin/menus/menu-item-form';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {LandingPageImageSelector} from '@common/admin/settings/landing-page-settings/landing-page-image-selector';
import {LandingPageSettingsContext} from '@common/admin/settings/landing-page-settings/landing-page-settings-context';
import {heroSectionLabels} from '@common/ui/landing-page/section-labels';
import {Button} from '@shadcn/button/button';
import {Drawer} from '@shadcn/drawer/drawer';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Slider} from '@shadcn/forms/slider/slider';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Popover} from '@shadcn/popover/popover';
import {ColorPickerPopover} from '@ui/color-picker/color-picker-popover';
import {Trans} from '@ui/i18n/trans';
import {
  ChevronRight,
  ChevronRightIcon,
  DropletIcon,
  PlusIcon,
} from 'lucide-react';
import {ReactNode, use} from 'react';
import {useFieldArray, useFormContext, useWatch} from 'react-hook-form';

const heroTypeOptions = Object.entries(heroSectionLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

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

export function HeroSectionSettings({index}: {index: number}) {
  const prefix =
    `client.landingPage.sections.${index}` as `client.landingPage.sections.${number}`;
  const buttons = useFieldArray<AdminSettings>({
    name: `${prefix}.buttons`,
  });
  return (
    <Field.Group>
      <HookForm.Field name={`${prefix}.name`}>
        <Field.Label>
          <Trans message="Hero type" />
        </Field.Label>
        <Select.Root items={heroTypeOptions}>
          <Select.Trigger className="w-full">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {heroTypeOptions.map(option => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name={`${prefix}.badge`}>
        <Field.Label>
          <Trans message="Badge" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>

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
                  <Field.Separator className="mt-2 mb-2" />
                  <Button
                    variant="outline"
                    color="danger"
                    size="sm"
                    className="w-max"
                    onClick={() => {
                      buttons.remove(buttonIndex);
                    }}
                  >
                    <Trans message="Remove button" />
                  </Button>
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

      <LandingPageImageSelector
        formPrefix={prefix}
        label={<Trans message="Header image" />}
      />

      <Field.Separator />

      <BgColorsSection formPathPrefix={`${prefix}.bgColors`} />

      <Field.Separator />

      <HookForm.Field name={`${prefix}.forceDarkMode`}>
        <Field.Label>
          <Switch />
          <Trans message="Always use dark mode colors" />
        </Field.Label>
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name={`${prefix}.showAsPanel`}>
        <Field.Label>
          <Switch />
          <Trans message="Show as panel" />
        </Field.Label>
        <Field.Error />
      </HookForm.Field>
      <CustomSettings prefix={prefix} index={index} />
    </Field.Group>
  );
}

function BgColorsSection({formPathPrefix}: {formPathPrefix: string}) {
  return (
    <div className="flex flex-col gap-2">
      <Field.Title>
        <Trans message="Background colors" />
      </Field.Title>
      <ColorPickerField
        label={<Trans message="Color 1" />}
        formKey={`${formPathPrefix}.color1`}
      />
      <ColorPickerField
        label={<Trans message="Color 2" />}
        formKey={`${formPathPrefix}.color2`}
      />
      <OpacityField name={`${formPathPrefix}.opacity`} />
    </div>
  );
}

function ColorPickerField({
  formKey,
  label,
}: {
  formKey: string;
  label: ReactNode;
}) {
  const {control, setValue} = useFormContext();
  const value = useWatch({name: formKey, control});
  return (
    <ColorPickerPopover
      value={value}
      onChange={value => setValue(formKey, value, {shouldDirty: true})}
      side="right"
    >
      <Popover.Trigger
        className="flex w-full justify-start shadow-none"
        render={<Button variant="outline" />}
      >
        <DropletIcon
          style={{fill: value}}
          className="size-6 stroke-border stroke-1"
        />
        {label}
        <ChevronRightIcon
          data-icon="inline-end"
          className="ml-auto text-muted-foreground"
        />
      </Popover.Trigger>
    </ColorPickerPopover>
  );
}

function OpacityField({name}: {name: string}) {
  return (
    <HookForm.Field name={name}>
      <Slider min={0} max={1} step={0.05}>
        <Field.Label>
          <Trans message="Opacity" />
        </Field.Label>
        <Slider.Value className="col-start-2 text-end" />
        <Slider.Control>
          <Slider.Track>
            <Slider.Indicator />
            <Slider.Thumb aria-label="Opacity" />
          </Slider.Track>
        </Slider.Control>
      </Slider>
      <Field.Error />
    </HookForm.Field>
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

type CustomSettingsProps = {
  prefix: string;
  index: number;
};
function CustomSettings({prefix, index}: CustomSettingsProps) {
  const ctx = use(LandingPageSettingsContext);
  const Component = ctx?.heroSettings;
  if (!Component) {
    return null;
  }
  return <Component formPrefix={prefix} index={index} />;
}
