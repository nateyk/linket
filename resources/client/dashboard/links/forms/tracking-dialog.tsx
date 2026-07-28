import {listTrackingPixelsOptions} from '@app/dashboard/tracking-pixels/tracking-pixels-queries';
import {useLinkFeatureStatus} from '@app/dashboard/upgrade/use-feature-status';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {CrupdateLinkBody} from '@app/gen/schemas/crupdate-link-body';
import {TrackingPixel} from '@app/gen/schemas/tracking-pixel';
import {NoFeaturePermissionPopover} from '@common/billing/upgrade/no-permission-button';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Combobox} from '@shadcn/forms/combobox/combobox';
import {Field, FieldSet} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Popover} from '@shadcn/popover/popover';
import {useQuery} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';
import {CircleQuestionMarkIcon, PlusIcon, XIcon} from 'lucide-react';
import {ReactNode, useState} from 'react';
import {useFieldArray, useForm} from 'react-hook-form';

export type TrackingDialogFormValue = Pick<
  CrupdateLinkBody,
  'utm' | 'utm_custom' | 'pixels'
>;

type Props = {
  values: TrackingDialogFormValue;
  onSubmit: (values: TrackingDialogFormValue) => void;
  children: ReactNode;
};
export function TrackingDialog({children, onSubmit, values}: Props) {
  const [open, setOpen] = useState(false);
  const handleSubmit = (values: TrackingDialogFormValue) => {
    onSubmit(values);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent values={values} onSubmit={handleSubmit} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({values, onSubmit}: Pick<Props, 'values' | 'onSubmit'>) {
  const {disabled: utmDisabled} = useLinkFeatureStatus('utm');

  const form = useForm<TrackingDialogFormValue>({
    defaultValues: values,
  });

  const infoTrigger = (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        className="text-muted-foreground"
        render={<Button variant="ghost" size="icon-sm" />}
      >
        <CircleQuestionMarkIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="text-center">
          <Trans message="Configure tracking integrations to track web traffic in analytics tools." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );

  return (
    <HookForm.Root form={form} onSubmit={onSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title className="gap-1">
            <Trans message="Tracking" />
            {infoTrigger}
            {utmDisabled && (
              <NoFeaturePermissionPopover.Root
                message={
                  <Trans message="Your current plan doesn't include tracking functionality." />
                }
              >
                <NoFeaturePermissionPopover.ButtonTrigger />
              </NoFeaturePermissionPopover.Root>
            )}
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <LinkPixelsField />
            <Field.Separator />
            <UtmFieldSet />
            <Field.Separator />
            <CustomTagsFieldSet />
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Close" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={utmDisabled}>
            <Trans message="Save changes" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

function UtmFieldSet() {
  const {trans} = useTrans();
  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <Trans message="UTM parameters" />
      </FieldSet.Legend>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <HookForm.Field name="utm.source">
          <Field.Label>
            <Trans message="Source" />
          </Field.Label>
          <Input placeholder="google" />
          <Field.Error />
        </HookForm.Field>
        <HookForm.Field name="utm.medium">
          <Field.Label>
            <Trans message="Medium" />
          </Field.Label>
          <Input placeholder="cpc" />
          <Field.Error />
        </HookForm.Field>
        <HookForm.Field name="utm.campaign">
          <Field.Label>
            <Trans message="Campaign" />
          </Field.Label>
          <Input placeholder={trans(message('holiday sale'))} />
          <Field.Error />
        </HookForm.Field>
        <HookForm.Field name="utm.term">
          <Field.Label>
            <Trans message="Term" />
          </Field.Label>
          <Input placeholder={trans(message('running shoes'))} />
          <Field.Error />
        </HookForm.Field>
        <HookForm.Field name="utm.content">
          <Field.Label>
            <Trans message="Content" />
          </Field.Label>
          <Input placeholder={trans(message('item link'))} />
          <Field.Error />
        </HookForm.Field>
        <HookForm.Field name="utm.ref">
          <Field.Label>
            <Trans message="Referral" />
          </Field.Label>
          <Input placeholder={trans(message('site.com'))} />
          <Field.Error />
        </HookForm.Field>
      </div>
    </FieldSet.Root>
  );
}

function CustomTagsFieldSet() {
  const {fields, append, remove} = useFieldArray<TrackingDialogFormValue>({
    name: 'utm_custom',
  });
  const {disabled: utmDisabled} = useLinkFeatureStatus('utm');

  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <Trans message="Custom parameters" />
      </FieldSet.Legend>
      <FieldSet.Description>
        <Trans message="Add query parameters to track web traffic in analytics tools." />
      </FieldSet.Description>
      <Field.Group>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-1 gap-3 md:grid-cols-[auto_auto_1fr]"
          >
            <HookForm.Field
              name={`utm_custom.${index}.key`}
              disabled={utmDisabled}
            >
              <Field.Label>
                <Trans message="Key" />
              </Field.Label>
              <Input required />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field
              name={`utm_custom.${index}.value`}
              disabled={utmDisabled}
            >
              <Field.Label>
                <Trans message="Value" />
              </Field.Label>
              <Input required />
              <Field.Error />
            </HookForm.Field>
            <RemoveButton onClick={() => remove(index)} />
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="w-max"
          onClick={() => {
            append({key: '', value: ''});
          }}
          disabled={utmDisabled}
        >
          <PlusIcon />
          <Trans message="Add parameter" />
        </Button>
      </Field.Group>
    </FieldSet.Root>
  );
}

type RemoveButtonProps = {
  onClick: () => void;
};
function RemoveButton({onClick}: RemoveButtonProps) {
  const isMobile = useIsMobileMediaQuery();

  if (isMobile) {
    return (
      <Button variant="outline" size="sm" onClick={onClick}>
        <Trans message="Remove" />
      </Button>
    );
  }

  return (
    <Button onClick={onClick} variant="ghost" size="icon" className="mt-6.5">
      <XIcon />
    </Button>
  );
}

function LinkPixelsField() {
  const {trans} = useTrans();
  const {routeType} = useDatatableRouteType();
  const [inputValue, setInputValue] = useState('');
  const {data} = useQuery(
    listTrackingPixelsOptions(routeType, {query: inputValue}),
  );
  const pixels = data?.data ?? [];

  return (
    <HookForm.Field name="pixels">
      <Field.Label>
        <Trans message="Pixels" />
      </Field.Label>
      <Combobox.Root
        items={pixels}
        filter={null}
        inputValue={inputValue}
        onInputValueChange={setInputValue}
        multiple
      >
        <Combobox.Chips>
          <Combobox.Value>
            {(value: TrackingPixel[]) => (
              <>
                {value.map(item => (
                  <Combobox.Chip key={item.id}>{item.name}</Combobox.Chip>
                ))}
                <Combobox.ChipsInput
                  placeholder={trans(message('Add pixels'))}
                />
              </>
            )}
          </Combobox.Value>
        </Combobox.Chips>
        <Combobox.Content>
          <Combobox.Empty>
            <Trans message="No matching pixels." />
          </Combobox.Empty>
          <Combobox.List>
            {(pixel: TrackingPixel) => (
              <Combobox.Item key={pixel.id} value={pixel}>
                {pixel.name}
              </Combobox.Item>
            )}
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
      <Field.Error />
    </HookForm.Field>
  );
}
