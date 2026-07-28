import {useLinkFeatureStatus} from '@app/dashboard/upgrade/use-feature-status';
import {CrupdateLinkBody} from '@app/gen/schemas/crupdate-link-body';
import {NoFeaturePermissionPopover} from '@common/billing/upgrade/no-permission-button';
import {Button} from '@shadcn/button/button';
import {Dialog as ShadcnDialog} from '@shadcn/dialog/dialog';
import {Field, FieldSet} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@shadcn/forms/number-field/number-field';
import {Popover} from '@shadcn/popover/popover';
import {FormDatePicker} from '@ui/forms/input-field/date/date-picker/date-picker';
import {Trans} from '@ui/i18n/trans';
import {useCurrentDateTime} from '@ui/i18n/use-current-date-time';
import {CircleQuestionMarkIcon} from 'lucide-react';
import {ReactNode, useState} from 'react';
import {useForm} from 'react-hook-form';

export type LinkExpirationDialogFormVaue = Pick<
  CrupdateLinkBody,
  'activates_at' | 'expires_at'
> & {
  exp_clicks_rule?: Required<CrupdateLinkBody>['rules'][number];
};

type Props = {
  values: LinkExpirationDialogFormVaue;
  onSubmit: (values: LinkExpirationDialogFormVaue) => void;
  children: ReactNode;
};

export function LinkExpirationDialog({children, onSubmit, values}: Props) {
  const [open, setOpen] = useState(false);
  const handleSubmit = (values: LinkExpirationDialogFormVaue) => {
    onSubmit(values);
    setOpen(false);
  };

  return (
    <ShadcnDialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <ShadcnDialog.Portal>
        <ShadcnDialog.Backdrop />
        <DialogContent values={values} onSubmit={handleSubmit} />
      </ShadcnDialog.Portal>
    </ShadcnDialog.Root>
  );
}

function DialogContent({values, onSubmit}: Pick<Props, 'values' | 'onSubmit'>) {
  const {disabled: expirationDisabled} = useLinkFeatureStatus('expiration');

  const form = useForm<LinkExpirationDialogFormVaue>({
    defaultValues: {
      activates_at: values.activates_at ?? '',
      expires_at: values.expires_at ?? '',
      exp_clicks_rule: values.exp_clicks_rule ?? {
        key: '',
        value: '',
        type: 'exp_clicks',
      },
    },
  });

  return (
    <HookForm.Root form={form} onSubmit={onSubmit}>
      <ShadcnDialog.Content className="sm:max-w-2xl">
        <ShadcnDialog.Header>
          <ShadcnDialog.Title>
            <Trans message="Schedule and expiration" />
            {expirationDisabled && (
              <NoFeaturePermissionPopover.Root
                message={
                  <Trans message="Your current plan doesn't include link expiration." />
                }
              >
                <NoFeaturePermissionPopover.ButtonTrigger />
              </NoFeaturePermissionPopover.Root>
            )}
          </ShadcnDialog.Title>
        </ShadcnDialog.Header>
        <ShadcnDialog.Body>
          <Field.Group>
            <ScheduleFieldSet disabled={expirationDisabled} />
            <Field.Separator />
            <ExpirationClicksFieldSet disabled={expirationDisabled} />
          </Field.Group>
        </ShadcnDialog.Body>
        <ShadcnDialog.Footer>
          <ShadcnDialog.CloseButton>
            <Trans message="Close" />
          </ShadcnDialog.CloseButton>
          <Button type="submit" disabled={expirationDisabled}>
            <Trans message="Save changes" />
          </Button>
        </ShadcnDialog.Footer>
      </ShadcnDialog.Content>
    </HookForm.Root>
  );
}

function ScheduleFieldSet({disabled}: {disabled: boolean}) {
  const now = useCurrentDateTime();
  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <Trans message="Schedule" />
      </FieldSet.Legend>
      <FieldSet.Description>
        <Trans message="Specify if item should become active or expire at a certain date." />
      </FieldSet.Description>
      <div className="grid grid-cols-1 content-end items-end gap-3 md:grid-cols-2">
        <FormDatePicker
          showCalendarFooter
          label={<Trans message="Activation date" />}
          min={now}
          name="activates_at"
          disabled={disabled}
          size="sm"
        />
        <FormDatePicker
          showCalendarFooter
          label={<Trans message="Expiration date" />}
          min={now}
          name="expires_at"
          disabled={disabled}
          size="sm"
        />
      </div>
    </FieldSet.Root>
  );
}

function ExpirationClicksFieldSet({disabled}: {disabled: boolean}) {
  const infoTrigger = (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        className="-ml-1 text-muted-foreground"
        render={<Button variant="ghost" size="icon-xs" />}
      >
        <CircleQuestionMarkIcon className="size-4" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="text-center">
          <Trans message="Redirect to this URL after expiration. Optional." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );

  return (
    <FieldSet.Root>
      <FieldSet.Legend>
        <Trans message="Expiration clicks" />
      </FieldSet.Legend>
      <FieldSet.Description>
        <Trans message="Specify if item should expire after a certain number of clicks." />
      </FieldSet.Description>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <HookForm.Field
          className="justify-between"
          name="exp_clicks_rule.key"
          disabled={disabled}
        >
          <Field.Label>
            <Trans message="Max clicks" />
          </Field.Label>
          <NumberField min={1} smallStep={1} largeStep={10}>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberField>
          <Field.Error />
        </HookForm.Field>
        <HookForm.Field
          name="exp_clicks_rule.value"
          className="gap-1"
          disabled={disabled}
        >
          <Field.Label>
            <Trans message="Redirect URL" />
            {infoTrigger}
          </Field.Label>
          <Input type="url" placeholder="Optional" />
          <Field.Error />
        </HookForm.Field>
      </div>
    </FieldSet.Root>
  );
}
