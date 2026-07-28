import {LandingPageImageSelector} from '@common/admin/settings/landing-page-settings/landing-page-image-selector';
import {IconPickerDialogContent} from '@common/ui/icon-picker/icon-picker-dialog-content';
import {FeatureWithScreenshotConfig} from '@common/ui/landing-page/features/feature-with-screenshot';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Drawer} from '@shadcn/drawer/drawer';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {createSvgIconFromTree} from '@ui/icons/create-svg-icon';
import {
  useSortable,
  UseSortableProps,
} from '@ui/interactions/dnd/sortable/use-sortable';
import {ChevronRight, GripVertical, Pencil, PlusIcon} from 'lucide-react';
import {useRef, useState} from 'react';
import {
  useFieldArray,
  UseFieldArrayReturn,
  useFormContext,
  useWatch,
} from 'react-hook-form';

const imageSizeOptions = [
  {value: 'xs', label: <Trans message="Extra small" />},
  {value: 'sm', label: <Trans message="Small" />},
  {value: 'md', label: <Trans message="Medium" />},
  {value: 'lg', label: <Trans message="Large" />},
] as const;

type Props = {
  index: number;
};
export function FeatureSectionSettings({index}: Props) {
  const prefix =
    `client.landingPage.sections.${index}` as `client.landingPage.sections.${number}`;
  return (
    <Field.Group>
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
        <Textarea rows={4} />
        <Field.Error />
      </HookForm.Field>

      <Field.Separator />

      <FeatureListEditor prefix={prefix} />

      <Field.Separator />

      <LandingPageImageSelector
        formPrefix={prefix}
        label={<Trans message="Screenshot" />}
      />

      <HookForm.Field name={`${prefix}.imageSize`}>
        <Field.Label>
          <Trans message="Image size" />
        </Field.Label>
        <Select.Root items={imageSizeOptions}>
          <Select.Trigger className="w-full">
            <Select.Value placeholder={<Trans message="Select image size" />} />
          </Select.Trigger>
          <Select.Content>
            {imageSizeOptions.map(option => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name={`${prefix}.alignLeft`}>
        <Field.Label>
          <Switch />
          <Trans message="Align image left" />
        </Field.Label>
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name={`${prefix}.inPanel`}>
        <Field.Label>
          <Switch />
          <Trans message="Wrap section with panel" />
        </Field.Label>
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name={`${prefix}.imagePanel`}>
        <Field.Label>
          <Switch />
          <Trans message="Wrap image with panel" />
        </Field.Label>
        <Field.Error />
      </HookForm.Field>

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

type FeatureListEditorProps = {
  prefix: string;
};
export function FeatureListEditor({prefix}: FeatureListEditorProps) {
  const {fields, remove, append, move} = useFieldArray({
    name: `${prefix}.features`,
  }) as unknown as UseFieldArrayReturn<FeatureWithScreenshotConfig, 'features'>;
  const [activeFeatureIndex, setActiveFeatureIndex] = useState<number | null>(
    null,
  );
  return (
    <div className="flex flex-col gap-2">
      <Field.Title>
        <Trans message="Feature list" />
      </Field.Title>
      {fields.map((feature, index) => (
        <FeatureListItem
          key={feature.id}
          feature={feature}
          features={fields}
          onSortEnd={(oldIndex, newIndex) => move(oldIndex, newIndex)}
          index={index}
          prefix={prefix}
          isOpen={activeFeatureIndex === index}
          onOpenChange={open => setActiveFeatureIndex(open ? index : null)}
          onDelete={() => {
            remove(index);
            setActiveFeatureIndex(null);
          }}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        color="primary"
        size="sm"
        className="w-max"
        onClick={() => {
          append({
            title: `Feature ${fields.length + 1}`,
            description: `Feature ${fields.length + 1} description`,
          });
          setActiveFeatureIndex(fields.length);
        }}
      >
        <PlusIcon />
        <Trans message="Add new feature" />
      </Button>
    </div>
  );
}

type FeatureListItemProps = {
  feature: {id: string};
  features: {id: string}[];
  onSortEnd: UseSortableProps['onSortEnd'];
  index: number;
  prefix: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
};
function FeatureListItem({
  feature,
  features,
  onSortEnd,
  index,
  prefix,
  isOpen,
  onOpenChange,
  onDelete,
}: FeatureListItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const {sortableProps} = useSortable({
    item: feature.id,
    items: features.map(f => f.id),
    ref,
    type: 'featureList',
    onSortEnd,
    strategy: 'liveSort',
  });
  const formPathPrefix = `${prefix}.features.${index}`;

  return (
    <Drawer.Root position="right" open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Trigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            ref={ref}
            {...sortableProps}
          />
        }
      >
        <GripVertical className="size-4 text-muted-foreground" />
        <FeatureName index={index} formPathPrefix={`${prefix}.features`} />
        <ChevronRight
          className="ml-auto text-muted-foreground"
          data-icon="inline-end"
        />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop />
        <Drawer.Content>
          <Drawer.Header className="flex-row items-center justify-between gap-4">
            <Drawer.Title>
              <FeatureName
                index={index}
                formPathPrefix={`${prefix}.features`}
              />
            </Drawer.Title>
            <Drawer.Close
              render={<Button type="button" variant="outline" size="sm" />}
            >
              <Trans message="Save & close" />
            </Drawer.Close>
          </Drawer.Header>
          <Drawer.Body>
            <EditFeatureForm formPathPrefix={formPathPrefix} />
          </Drawer.Body>
          <Drawer.Footer>
            <Button
              type="button"
              variant="outline"
              color="danger"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                // need to wait until drawer close animation is complete and form fields are unbound,
                // otherwise value will not get removed from react hook form properly
                setTimeout(() => onDelete(), 160);
              }}
            >
              <Trans message="Delete feature" />
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

type EditFeatureFormProps = {
  formPathPrefix: string;
};
function EditFeatureForm({formPathPrefix}: EditFeatureFormProps) {
  return (
    <Field.Group>
      <IconDialogTrigger formPrefix={formPathPrefix} />

      <HookForm.Field name={`${formPathPrefix}.title`}>
        <Field.Label>
          <Trans message="Title" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name={`${formPathPrefix}.description`}>
        <Field.Label>
          <Trans message="Description" />
        </Field.Label>
        <Textarea rows={4} />
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}

type FeatureNameProps = {
  index: number;
  formPathPrefix: string;
};
function FeatureName({index, formPathPrefix}: FeatureNameProps) {
  const title = useWatch({
    name: `${formPathPrefix}.${index}.title`,
  });
  return (
    title || <Trans message="Feature :number" values={{number: index + 1}} />
  );
}

type IconDialogTriggerProps = {
  formPrefix: string;
};
function IconDialogTrigger({formPrefix}: IconDialogTriggerProps) {
  const {setValue} = useFormContext();
  const fieldName = `${formPrefix}.icon`;
  const watchedItemIcon = useWatch({
    name: fieldName,
  });
  const Icon =
    watchedItemIcon && createSvgIconFromTree(watchedItemIcon, '', 'lucide');
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={<Button type="button" variant="outline" className="w-max" />}
      >
        {Icon ? <Icon /> : <Pencil />}
        <Trans message="Select icon" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <IconPickerDialogContent
          onIconSelected={iconTree => {
            setValue(fieldName, iconTree, {
              shouldDirty: true,
            });
            setOpen(false);
          }}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}
