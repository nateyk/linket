import {AdminSettings} from '@common/admin/settings/admin-settings';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Switch} from '@shadcn/forms/switch/switch';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {ImageZoomDialog} from '@ui/overlays/dialog/image-zoom-dialog';
import {useContext} from 'react';
import {useForm} from 'react-hook-form';
import {
  AdConfig,
  SiteConfigContext,
} from '../../../core/settings/site-config-context';
import {useAdminSettings} from '../use-admin-settings';

export function Component() {
  const {data} = useAdminSettings();
  const {
    admin: {ads},
  } = useContext(SiteConfigContext);

  const adsData = data?.client?.ads as Record<string, string | boolean>;
  const defaultAdsSettings: Record<string, string | boolean> = {
    disable: adsData?.disable ?? false,
  };
  ads.forEach(ad => {
    const key = ad.slot.replace('ads.', '');
    defaultAdsSettings[key] = adsData?.[key] ?? '';
  });

  const form = useForm<AdminSettings>({
    defaultValues: {client: {ads: defaultAdsSettings}},
  });

  return (
    <AdminSettingsLayout
      form={form}
      title={<Trans message="Predefined AD slots" />}
    >
      <div className="flex flex-col gap-7">
        {ads.map(ad => (
          <AdSection key={ad.slot} adConfig={ad} />
        ))}
        <HookForm.Field name="client.ads.disable" className="mb-7.5">
          <Field.Label>
            <Switch />
            <Trans message="Disable ads" />
          </Field.Label>
          <Field.Description>
            <Trans message="Disable all add related functionality across the site." />
          </Field.Description>
        </HookForm.Field>
      </div>
    </AdminSettingsLayout>
  );
}

function AdSection({adConfig}: {adConfig: AdConfig}) {
  return (
    <div className="flex items-stretch gap-6">
      <HookForm.Field className="flex-auto" name={`client.${adConfig.slot}`}>
        <Field.Label>{adConfig.description}</Field.Label>
        <Textarea className="flex-1" />
        <Field.Error />
      </HookForm.Field>
      <ImageZoomDialog image={adConfig.image}>
        <Dialog.Trigger className="block h-36 cursor-zoom-in rounded-input transition hover:scale-105 max-md:hidden">
          <img
            src={adConfig.image}
            className="h-full overflow-hidden rounded-input border"
            alt="Ad slot example"
          />
        </Dialog.Trigger>
      </ImageZoomDialog>
    </div>
  );
}
