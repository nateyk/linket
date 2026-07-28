import {DestinationUrlField} from '@app/dashboard/links/forms/destination-url-field';
import {LinkFolderField} from '@app/dashboard/links/forms/link-folder-field';
import {LinkFormActionButtons} from '@app/dashboard/links/forms/link-form-action-buttons';
import {LinkPreviewPanel} from '@app/dashboard/links/forms/link-preview-panel';
import {LinkTypeField} from '@app/dashboard/links/forms/link-type-field';
import {LinkeableQRCodePanel} from '@app/dashboard/links/forms/linkeable-qr-code-panel';
import {LinkeableTagsField} from '@app/dashboard/links/forms/linkeable-tags-field';
import {ShortUrlField} from '@app/dashboard/links/forms/short-url-field';
import {
  retrieveLinkOptions,
  updateLinkOptions,
} from '@app/dashboard/links/links-queries';
import {urlIsValid} from '@app/dashboard/links/utils/url-is-valid';
import {useLinkDefaultFormValues} from '@app/dashboard/links/utils/use-linkeable-default-form-values';
import {PermissionAwareButton} from '@app/dashboard/upgrade/permission-aware-button';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {CrupdateLinkBody} from '@app/gen/schemas/crupdate-link-body';
import {Link} from '@app/gen/schemas/link';
import {DirtyFormSaveDrawer} from '@common/admin/crupdate-resource-layout';
import {UserAvatar} from '@common/auth/user-avatar';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Separator} from '@shadcn/separator';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useSettings} from '@ui/settings/use-settings';
import {useMediaQuery} from '@ui/utils/hooks/use-media-query';
import {useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {useParams} from 'react-router';

export function Component() {
  const navigate = useNavigate();
  const {trans} = useTrans();
  const {routeType} = useDatatableRouteType();
  const {linkId} = useRequiredParams(['linkId']);
  const {folderId} = useParams();
  const query = useSuspenseQuery(retrieveLinkOptions(Number(linkId)));
  const {links} = useSettings();

  const defaultFormValues = useLinkDefaultFormValues({link: query.data.data});

  const form = useForm<CrupdateLinkBody>({
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    form.reset(defaultFormValues);
  }, [form, defaultFormValues]);

  const updateLink = useMutation(updateLinkOptions(Number(linkId)));
  const shouldCollapseSidebar = useMediaQuery('(max-width: 1200px)');

  const handleSubmit = (values: CrupdateLinkBody) => {
    if (!urlIsValid(values.long_url)) {
      form.setError('long_url', {
        message: trans(message('This url is invalid.')),
      });
      return;
    }

    updateLink.mutate(values, {
      onSuccess: () => {
        if (folderId) {
          navigate(`/${routeType}/folders/${folderId}/links`);
        } else {
          navigate(`/${routeType}/links`);
        }
        toast.success(<Trans message="Link updated" />);
      },
      onError: err => onFormQueryError(err, form, [], true),
    });
  };

  return (
    <HookForm.Root
      className="flex h-full min-h-0"
      form={form}
      onSubmit={handleSubmit}
    >
      <DirtyFormSaveDrawer
        isLoading={updateLink.isPending}
        saveButton={
          <PermissionAwareButton resource="link" action="update">
            <Button type="submit" size="sm" disabled={updateLink.isPending}>
              <Trans message="Save changes" />
            </Button>
          </PermissionAwareButton>
        }
      />

      <Field.Group className="compact-scrollbar mx-auto max-w-xl flex-auto overflow-y-auto px-4 lg:pt-6">
        {shouldCollapseSidebar && <LinkFormActionButtons form={form} />}
        <DestinationUrlField />
        <ShortUrlField backHalfName="back_half" domainName="domain_id" />
        {links?.enable_type && <LinkTypeField />}
        <LinkFolderField />
        <LinkeableTagsField />
        {shouldCollapseSidebar && (
          <>
            <LinkeableQRCodePanel qrCode={query.data.data.qr_code} />
            <LinkPreviewPanel />
          </>
        )}
        {!shouldCollapseSidebar && <LinkFormActionButtons form={form} />}
        <Field.Separator className="my-2 lg:my-0" />
        <OwnerInfoSection link={query.data.data} />
      </Field.Group>
      {!shouldCollapseSidebar ? <RightSidebar /> : null}
    </HookForm.Root>
  );
}

function OwnerInfoSection({link}: {link: Link}) {
  if (!link.user) return null;
  return (
    <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
      <UserAvatar user={link.user} size="xs" />
      <Trans
        message="Created by :name on :date"
        values={{
          name: <strong className="truncate">{link.user.name}</strong>,
          date: (
            <strong>
              <FormattedDate date={link.created_at} />
            </strong>
          ),
        }}
      />
    </div>
  );
}

function RightSidebar() {
  const {linkId} = useRequiredParams(['linkId']);
  const query = useSuspenseQuery(retrieveLinkOptions(Number(linkId)));
  return (
    <section className="compact-scrollbar hidden w-full shrink-0 flex-col gap-6 overflow-y-auto border-l border-border/80 p-6 lg:flex lg:w-80">
      <LinkeableQRCodePanel qrCode={query.data.data.qr_code} />
      <Separator />
      <LinkPreviewPanel />
    </section>
  );
}
