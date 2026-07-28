import {AdminDocsUrls} from '@app/admin/admin-config';
import {UploadType} from '@app/site-config';
import {AdminSettings} from '@common/admin/settings/admin-settings';
import {AdminSettingsLayout} from '@common/admin/settings/layout/settings-layout';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {generateSitemapOptions} from '@common/admin/settings/settings-queries';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {ExternalLink} from '@ui/buttons/external-link';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import deepmerge from 'deepmerge';
import {ReactNode, useMemo} from 'react';
import {useForm, useFormContext, useWatch} from 'react-hook-form';

interface Props {
  children?: ReactNode;
  defaultValues?: {client?: Partial<AdminSettings['client']>};
  slotOne?: ReactNode;
}
export function Component({children, defaultValues, slotOne}: Props) {
  const {data} = useAdminSettings();

  const mergedDefaultValues = useMemo(() => {
    return deepmerge(defaultValues ?? {}, {
      ...defaultValues,
      client: {
        branding: {
          favicon: data.client.branding.favicon,
          logo_light: data.client.branding.logo_light,
          logo_dark: data.client.branding.logo_dark,
          logo_light_mobile: data.client.branding.logo_light_mobile,
          logo_dark_mobile: data.client.branding.logo_dark_mobile,
          site_description: data.client.branding.site_description,
        },
      },
      server: {
        app_name: data.server.app_name,
      },
    });
  }, [defaultValues, data]);

  const form = useForm<AdminSettings>({
    defaultValues: mergedDefaultValues,
  });

  return (
    <AdminSettingsLayout
      form={form}
      title={<Trans message="General" />}
      docsLink={AdminDocsUrls.settings.general}
    >
      <div className="flex flex-col gap-6">
        <SiteUrlSection />
        <SiteNameSection />
        {slotOne}
        <FaviconSection />
        <LightModeLogo />
        <DarkModeLogo />
        <MobileLogos />
        {children}
        <SitemapSection />
      </div>
    </AdminSettingsLayout>
  );
}

function SiteUrlSection() {
  const {data} = useAdminSettings();

  if (!data) return null;

  let append = null;
  const server = data!.server;
  const isInvalid = server.newAppUrl && server.newAppUrl !== server.app_url;
  if (isInvalid) {
    append = (
      <Field.Description className="text-destructive">
        <Trans
          values={{
            baseUrl: server.app_url,
            currentUrl: server.newAppUrl,
            b: chunks => <b>{chunks}</b>,
          }}
          message="Base site url is set as <b>:baseUrl</b> in configuration, but current url is <b>:currentUrl</b>. It is recommended to set the primary url you want to use in configuration file and then redirect all other url versions to this primary version via cpanel or .htaccess file."
        />
      </Field.Description>
    );
  }

  return (
    <SettingsPanel
      title={<Trans message="Site URL" />}
      description={
        <div>
          <Trans message="The primary domain for your site." />
        </div>
      }
      link={
        <DocsLink link="https://support.vebto.com/hc/articles/35/primary-site-url">
          <Trans message="What is a primary site url?" />
        </DocsLink>
      }
    >
      <Field.Root name="server.app_url" invalid={!!isInvalid}>
        <Field.Label>
          <Trans message="Primary site url" />
        </Field.Label>
        <Input readOnly bindToHookForm={false} value={server.app_url} />
        {append}
      </Field.Root>
    </SettingsPanel>
  );
}

function SiteNameSection() {
  return (
    <SettingsPanel
      title={<Trans message="Site name" />}
      description={
        <div>
          <Trans message="Short name for the site that will appear in browser tabs, seo tags, PWA app and other places." />
        </div>
      }
    >
      <HookForm.Field name="server.app_name">
        <Field.Label>
          <Trans message="Site name" />
        </Field.Label>
        <Input />
        <Field.Error />
      </HookForm.Field>
    </SettingsPanel>
  );
}

function FaviconSection() {
  return (
    <SettingsPanel
      title={<Trans message="Favicon" />}
      description={
        <div>
          <Trans message="This will generate different size favicons. Image should be at least 512x512 in size." />
        </div>
      }
    >
      <div className="w-max">
        <BrandingImageSelector type="favicon" />
      </div>
    </SettingsPanel>
  );
}

function LightModeLogo() {
  return (
    <SettingsPanel
      title={<Trans message="Dark logo" />}
      description={
        <div>
          <Trans message="Used when global color scheme or specific element scheme is light. Default logo is 516x117px size." />
        </div>
      }
    >
      <BrandingImageSelector type="logo_dark" />
    </SettingsPanel>
  );
}

function DarkModeLogo() {
  return (
    <SettingsPanel
      title={<Trans message="Light logo" />}
      description={
        <div>
          <Trans message="Used when global color scheme or specific element scheme is dark. If empty, light mode logo will be used." />
        </div>
      }
    >
      <BrandingImageSelector type="logo_light" />
    </SettingsPanel>
  );
}

function MobileLogos() {
  return (
    <SettingsPanel
      title={<Trans message="Compact logos" />}
      description={
        <div>
          <Trans message="Will show these logos if there's not enough space for regular logos. For example on mobile or when screen is too small." />
        </div>
      }
    >
      <Field.Group className="flex-row items-center gap-6">
        <BrandingImageSelector
          type="logo_dark_mobile"
          title={<Trans message="Dark logo" />}
        />
        <BrandingImageSelector
          type="logo_light_mobile"
          title={<Trans message="Light logo" />}
        />
      </Field.Group>
    </SettingsPanel>
  );
}

interface ImageSelectorProps {
  type: keyof AdminSettings['client']['branding'];
  title?: ReactNode;
}
function BrandingImageSelector({type, title}: ImageSelectorProps) {
  const value = useWatch({name: `client.branding.${type}`});
  const {setValue} = useFormContext();

  return (
    <HookForm.Field name={`client.branding.${type}`} className="max-w-max">
      {title ? <Field.Label>{title}</Field.Label> : null}
      <ImageSelector.Input
        uploadType={UploadType.brandingImages}
        value={value}
        onChange={value => {
          setValue(`client.branding.${type}`, value, {shouldDirty: true});
        }}
      />
      <Field.Error />
    </HookForm.Field>
  );
}

function SitemapSection() {
  const {base_url} = useSettings();
  const generateSitemap = useMutation({
    ...generateSitemapOptions(),
    onSuccess: () => {
      toast.success(<Trans message="Sitemap generated" />);
    },
    onError: err => {
      showHttpErrorToast(err);
    },
  });

  const url = `${base_url}/storage/sitemaps/sitemap-index.xml`;
  const link = <ExternalLink href={url}>{url}</ExternalLink>;

  return (
    <SettingsPanel
      title={<Trans message="Sitemap" />}
      description={
        <div>
          <Trans message="Generate a sitemap to help search engines discover and index your site content." />
        </div>
      }
    >
      <div className="flex flex-col items-start gap-3.5">
        <Button
          variant="outline"
          size="sm"
          color="primary"
          disabled={generateSitemap.isPending}
          onClick={() => {
            generateSitemap.mutate();
          }}
        >
          <Trans message="Generate sitemap" />
        </Button>
        <div className="text-xs text-muted-foreground">
          <Trans
            message="Once generated, sitemap url will be: :url"
            values={{
              url: link,
            }}
          />
        </div>
      </div>
    </SettingsPanel>
  );
}
