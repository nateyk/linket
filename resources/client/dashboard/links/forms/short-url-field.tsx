import {LinkDomainSelect} from '@app/dashboard/links/forms/link-domain-select';
import {useLinkFeatureStatus} from '@app/dashboard/upgrade/use-feature-status';
import {NoFeaturePermissionPopover} from '@common/billing/upgrade/no-permission-button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useSettings} from '@ui/settings/use-settings';
import {ReactNode, useId} from 'react';

type Props = {
  backHalfName: string;
  domainName: string;
  domainLabel?: ReactNode;
  disabled?: boolean;
};
export function ShortUrlField({
  backHalfName,
  domainName,
  domainLabel,
  disabled: propsDisabled,
}: Props) {
  const {links} = useSettings();
  const {trans} = useTrans();
  const {disabled: featureDisabled} = useLinkFeatureStatus('back_half');
  const anyDisabled = featureDisabled || propsDisabled;
  const backHalfId = useId();

  return (
    <div className="flex gap-4">
      <div className="w-64">
        <LinkDomainSelect
          name={domainName}
          disabled={anyDisabled}
          label={domainLabel || <Trans message="Domain" />}
        />
      </div>
      <div className="text-muted-foregroun flex self-stretch pt-8.5">/</div>
      <HookForm.Field name={backHalfName}>
        <Field.Label>
          {featureDisabled ? (
            <Trans message="Back-half" />
          ) : (
            <Trans message="Back-half (optional)" />
          )}
          {featureDisabled && (
            <NoFeaturePermissionPopover.Root
              message={
                <Trans message="Your current plan does not include back-half editing." />
              }
            >
              <NoFeaturePermissionPopover.ButtonTrigger className="max-h-4.5" />
            </NoFeaturePermissionPopover.Root>
          )}
        </Field.Label>
        <Input
          id={backHalfId}
          placeholder={trans(message('Back-half (Optional)'))}
          pattern="[A-Za-z0-9\-]+"
          minLength={links?.back_half_min}
          maxLength={links?.back_half_max}
          disabled={anyDisabled}
        />
        <Field.Error />
      </HookForm.Field>
    </div>
  );
}
