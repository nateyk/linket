import {
  LinkExpirationDialog,
  LinkExpirationDialogFormVaue,
} from '@app/dashboard/links/forms/link-expiration-dialog';
import {LinkPasswordDialog} from '@app/dashboard/links/forms/link-password-dialog';
import {RetargetingDialog} from '@app/dashboard/links/forms/retargeting-dialog';
import {
  TrackingDialog,
  TrackingDialogFormValue,
} from '@app/dashboard/links/forms/tracking-dialog';
import {CrupdateLinkBody} from '@app/gen/schemas/crupdate-link-body';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {
  ClockFadingIcon,
  DiamondPlusIcon,
  LockKeyholeIcon,
  MousePointerClickIcon,
} from 'lucide-react';
import {useMemo} from 'react';
import {UseFormReturn, useWatch} from 'react-hook-form';

type Props = {
  form: UseFormReturn<Partial<Omit<CrupdateLinkBody, 'name' | 'long_url'>>>;
  className?: string;
};
export function LinkFormActionButtons(props: Props) {
  return (
    <div
      className={cn(
        'compact-scrollbar flex shrink-0 items-center gap-2 overflow-x-auto',
        props.className,
      )}
    >
      <TrackingButton {...props} />
      <RetargetingButton {...props} />
      <PasswordButton {...props} />
      <ExpirationButton {...props} />
    </div>
  );
}

function TrackingButton({form}: Props) {
  const [utmParams, utmCustom, pixels] = useWatch({
    name: ['utm', 'utm_custom', 'pixels'],
    control: form.control,
  });

  const hasTrackingParams =
    (utmParams && Object.values(utmParams).some(value => !!value)) ||
    (utmCustom && utmCustom.length > 0) ||
    (pixels && pixels.length > 0);

  const currentValues = useMemo(
    () => ({
      utm: utmParams,
      utm_custom: utmCustom,
      pixels: pixels,
    }),
    [utmParams, utmCustom, pixels],
  );

  const handleSumbmit = (values: TrackingDialogFormValue) => {
    form.setValue('utm', values.utm, {shouldDirty: true});
    form.setValue('utm_custom', values.utm_custom, {shouldDirty: true});
    form.setValue('pixels', values.pixels, {shouldDirty: true});
  };

  return (
    <TrackingDialog values={currentValues} onSubmit={handleSumbmit}>
      <Dialog.Trigger
        render={
          <Button
            variant="outline"
            size="sm"
            color={hasTrackingParams ? 'primary' : 'default'}
            className="bg-background dark:bg-input/30"
          />
        }
      >
        <MousePointerClickIcon />
        <Trans message="Tracking" />
      </Dialog.Trigger>
    </TrackingDialog>
  );
}

function RetargetingButton({form}: Props) {
  const rules = useWatch({
    name: 'rules',
    control: form.control,
  });

  const hasRetargetingRules = rules?.some(rule => rule.type !== 'exp_clicks');

  const handleSubmit = (values: {rules: CrupdateLinkBody['rules']}) => {
    form.setValue('rules', values.rules, {shouldDirty: true});
  };

  return (
    <RetargetingDialog values={rules} onSubmit={handleSubmit}>
      <Dialog.Trigger
        render={
          <Button
            variant="outline"
            size="sm"
            color={hasRetargetingRules ? 'primary' : 'default'}
            className="bg-background dark:bg-input/30"
          />
        }
      >
        <DiamondPlusIcon />
        <Trans message="Retargeting" />
      </Dialog.Trigger>
    </RetargetingDialog>
  );
}

function PasswordButton({form}: Props) {
  const password = useWatch({
    name: 'password',
    control: form.control,
  });
  const hasPassword = !!password;
  const currentValues = {
    password: form.getValues('password') || '',
  };
  const handleSubmit = (values: {password: string}) => {
    form.setValue('password', values.password || '', {shouldDirty: true});
  };

  return (
    <LinkPasswordDialog values={currentValues} onSubmit={handleSubmit}>
      <Dialog.Trigger
        render={
          <Button
            variant="outline"
            size="sm"
            color={hasPassword ? 'primary' : 'default'}
            className="bg-background dark:bg-input/30"
          />
        }
      >
        <LockKeyholeIcon />
        <Trans message="Password" />
      </Dialog.Trigger>
    </LinkPasswordDialog>
  );
}

function ExpirationButton({form}: Props) {
  const [activatesAt, expiresAt] = useWatch({
    name: ['activates_at', 'expires_at'],
    control: form.control,
  });
  const rules = useWatch({
    name: 'rules',
    control: form.control,
  });

  const hasExpirationRule = rules?.some(rule => rule.type === 'exp_clicks');
  const hasExpiration = !!activatesAt || !!expiresAt || hasExpirationRule;

  const currentValues: LinkExpirationDialogFormVaue = useMemo(
    () => ({
      activates_at: activatesAt || undefined,
      expires_at: expiresAt || undefined,
      exp_clicks_rule:
        rules?.find(rule => rule.type === 'exp_clicks') || undefined,
    }),
    [activatesAt, expiresAt, rules],
  );

  const handleSubmit = (values: LinkExpirationDialogFormVaue) => {
    form.setValue('activates_at', values.activates_at || '', {
      shouldDirty: true,
    });
    form.setValue('expires_at', values.expires_at || '', {shouldDirty: true});

    if (values.exp_clicks_rule) {
      const oldIndex = (rules ?? []).findIndex(
        rule => rule.type === 'exp_clicks',
      );
      const newRules = [...(rules ?? [])];
      if (oldIndex > -1) {
        newRules[oldIndex] = values.exp_clicks_rule!;
      } else {
        newRules.push(values.exp_clicks_rule!);
      }
      form.setValue('rules', newRules, {
        shouldDirty: true,
      });
    }
  };

  return (
    <LinkExpirationDialog values={currentValues} onSubmit={handleSubmit}>
      <Dialog.Trigger
        render={
          <Button
            variant="outline"
            size="sm"
            color={hasExpiration ? 'primary' : 'default'}
            className="bg-background dark:bg-input/30"
          />
        }
      >
        <ClockFadingIcon />
        <Trans message="Schedule" />
      </Dialog.Trigger>
    </LinkExpirationDialog>
  );
}
