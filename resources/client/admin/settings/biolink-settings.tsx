import {UploadType} from '@app/site-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {Trans} from '@ui/i18n/trans';
import {useForm, useFormContext, useWatch} from 'react-hook-form';

export function Component() {
  const {data} = useAdminSettings();
  const form = useForm<AdminSettings>({
    defaultValues: {
      client: {
        biolink: {
          show_branding: data.client.biolink?.show_branding ?? true,
          branding_img: data.client.biolink?.branding_img,
        },
      },
      server: {
        unsplash_access_key: data.server?.unsplash_access_key ?? '',
      },
    },
  });

  return (
    <AdminSettingsLayout form={form} title={<Trans message="Biolinks" />}>
      <div className="flex flex-col gap-6">
        <BiolinkLogoPanel />
        <UnsplashPanel />
      </div>
    </AdminSettingsLayout>
  );
}

function BiolinkLogoPanel() {
  const {setValue} = useFormContext();
  const imageValue = useWatch({name: 'client.biolink.branding_img'}) ?? '';

  return (
    <SettingsPanel
      title={<Trans message="Biolink logo" />}
      description={
        <Trans message="Show logo at the bottom of biolink pages if user is not subscribed. You can upload a custom image, otherwise site logo will be used." />
      }
    >
      <Field.Group>
        <HookForm.Field name="client.biolink.show_branding">
          <Field.Label>
            <Switch />
            <Trans message="Show biolink logo" />
          </Field.Label>
        </HookForm.Field>

        <Field.Root name="client.biolink.branding_img">
          <Field.Label>
            <Trans message="Custom biolink logo" />
          </Field.Label>
          <ImageSelector.Input
            uploadType={UploadType.brandingImages}
            value={imageValue}
            onChange={value => {
              setValue('client.biolink.branding_img', value, {
                shouldDirty: true,
              });
            }}
          />
          <Field.Error />
        </Field.Root>
      </Field.Group>
    </SettingsPanel>
  );
}

function UnsplashPanel() {
  return (
    <SettingsPanel
      title={<Trans message="Unsplash" />}
      description={
        <Trans message="Allow users to search and select Unsplash images for biolink backgrounds." />
      }
    >
      <HookForm.Field name="server.unsplash_access_key">
        <Field.Label>
          <Trans message="Unsplash API key" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}
