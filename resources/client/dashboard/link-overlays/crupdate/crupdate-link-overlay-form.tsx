import {
  LinkOverlayColors,
  LinkOverlayPositions,
  LinkOverlayThemes,
} from '@app/dashboard/link-overlays/crupdate/link-overlay-constants';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {CrupdateLinkOverlayBody} from '@app/gen/schemas/crupdate-link-overlay-body';
import {LinkOverlay} from '@app/gen/schemas/link-overlay';
import {FloatingLinkOverlay} from '@app/short-links/floating-link-overlay';
import {UploadType} from '@app/site-config';
import {DirtyFormSaveDrawer} from '@common/admin/crupdate-resource-layout';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Popover} from '@shadcn/popover/popover';
import {Tabs} from '@shadcn/tabs/tabs';
import {ColorPickerPopover} from '@ui/color-picker/color-picker-popover';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {ChevronRightIcon, DropletIcon} from 'lucide-react';
import {ReactElement, use} from 'react';
import {useFormContext, UseFormReturn, useWatch} from 'react-hook-form';
import {useParams} from 'react-router';
import {OverlayWebsiteBackground} from './overlay-website-background';

interface CrupdateLinkOverlayFormProps {
  isLoading: boolean;
  form: UseFormReturn<CrupdateLinkOverlayBody>;
  onSubmit: (values: CrupdateLinkOverlayBody) => void;
}
export function CrupdateLinkOverlayForm({
  form,
  isLoading,
  onSubmit,
}: CrupdateLinkOverlayFormProps) {
  const {routeType} = useDatatableRouteType();
  const {isMobileMode} = use(DashboardLayoutContext);
  const {overlayId} = useParams();

  return (
    <>
      <DashboardLayout.Section
        render={<HookForm.Root form={form} onSubmit={onSubmit} />}
        className={cn(!isMobileMode ? 'w-72' : 'w-full')}
      >
        <DirtyFormSaveDrawer isLoading={isLoading} />
        <DashboardLayout.SectionHeader className="border-none">
          <DashboardLayout.SectionTitle>
            <DashboardLayout.SidebarToggle />
            <Breadcrumb.Root className="text-base">
              <Breadcrumb.Item>
                <Breadcrumb.Link to={`/${routeType}/link-overlays`}>
                  <Trans message="Overlays" />
                </Breadcrumb.Link>
              </Breadcrumb.Item>
              <Breadcrumb.Separator />
              <Breadcrumb.Item>
                <Breadcrumb.Page>
                  {overlayId ? (
                    <Trans message="Update" />
                  ) : (
                    <Trans message="Create" />
                  )}
                </Breadcrumb.Page>
              </Breadcrumb.Item>
            </Breadcrumb.Root>
          </DashboardLayout.SectionTitle>
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent className="compact-scrollbar px-5 pt-1 pb-5">
          <Tabs.Root defaultValue="general" className="max-w-full flex-1">
            <Tabs.List className="w-full" variant="line">
              <Tabs.Tab value="general">
                <Trans message="General" />
              </Tabs.Tab>
              <Tabs.Tab value="style">
                <Trans message="Style" />
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="general">
              <GeneralFields />
            </Tabs.Panel>
            <Tabs.Panel value="style">
              <StyleFields />
            </Tabs.Panel>
          </Tabs.Root>
        </DashboardLayout.SectionContent>
      </DashboardLayout.Section>
      {!isMobileMode && (
        <DashboardLayout.MainSection className="relative hidden md:block">
          <OverlayWebsiteBackground />
          <OverlayPreview form={form} />
        </DashboardLayout.MainSection>
      )}
    </>
  );
}

function GeneralFields() {
  return (
    <Field.Group className="pt-5">
      <HookForm.Field name="name">
        <Field.Label>
          <Trans message="Name" />
        </Field.Label>
        <Input required />
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name="position">
        <Field.Label>
          <Trans message="Position" />
        </Field.Label>
        <Select.Root items={LinkOverlayPositions}>
          <Select.Trigger className="w-full">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {LinkOverlayPositions.map(item => (
              <Select.Item key={item.value} value={item.value}>
                {item.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name="theme">
        <Field.Label>
          <Trans message="Theme" />
        </Field.Label>
        <Select.Root items={LinkOverlayThemes}>
          <Select.Trigger className="w-full">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            {LinkOverlayThemes.map(item => (
              <Select.Item key={item.value} value={item.value}>
                {item.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name="message">
        <Field.Label>
          <Trans message="Message" />
        </Field.Label>
        <Textarea maxLength={200} />
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name="label">
        <Field.Label>
          <Trans message="Label" />
        </Field.Label>
        <Input maxLength={8} />
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name="btn_link">
        <Field.Label>
          <Trans message="Button link" />
        </Field.Label>
        <Input type="url" />
        <Field.Error />
      </HookForm.Field>

      <HookForm.Field name="btn_text">
        <Field.Label>
          <Trans message="Button text" />
        </Field.Label>
        <Input maxLength={30} />
        <Field.Error />
      </HookForm.Field>
    </Field.Group>
  );
}

function StyleFields() {
  return (
    <div className="flex flex-col gap-4 pt-5">
      <FileUploadProvider>
        <BackgroundField />
      </FileUploadProvider>
      {LinkOverlayColors.map(({value, label}) => (
        <ColorField name={value} key={value}>
          {label}
        </ColorField>
      ))}
    </div>
  );
}

interface ColorFieldProps {
  name: keyof LinkOverlay['colors'];
  children: ReactElement;
}
function ColorField({name, children}: ColorFieldProps) {
  const {setValue} = useFormContext<CrupdateLinkOverlayBody>();
  const color = useWatch({name: `colors.${name}`});

  return (
    <ColorPickerPopover
      value={color ?? ''}
      onChange={value => {
        setValue(`colors.${name}`, value, {shouldDirty: true});
      }}
    >
      <Popover.Trigger
        className="w-full justify-start"
        render={<Button variant="outline" color="default" />}
      >
        <DropletIcon
          style={{fill: color}}
          className="size-6 stroke-border stroke-1"
        />
        <div>{children}</div>
        <ChevronRightIcon
          data-icon="inline-end"
          className="ml-auto text-muted-foreground"
        />
      </Popover.Trigger>
    </ColorPickerPopover>
  );
}

function BackgroundField() {
  const {setValue} = useFormContext<CrupdateLinkOverlayBody>();
  const imageValue = useWatch({name: 'colors.bg-image'}) ?? '';
  return (
    <Field.Root name="colors.bg-image">
      <Field.Label>
        <Trans message="Background image" />
      </Field.Label>
      <ImageSelector.Input
        uploadType={UploadType.linkImages}
        value={imageValue}
        onChange={value => {
          setValue('colors.bg-image', value, {
            shouldDirty: true,
          });
        }}
      />
      <Field.Error />
    </Field.Root>
  );
}

type OverlayPreviewProps = {
  form: UseFormReturn<CrupdateLinkOverlayBody>;
};
function OverlayPreview({form}: OverlayPreviewProps) {
  const values = useWatch<CrupdateLinkOverlayBody>({control: form.control});
  return <FloatingLinkOverlay overlay={values as CrupdateLinkOverlayBody} />;
}
