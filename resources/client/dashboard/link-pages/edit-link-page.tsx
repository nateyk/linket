import {
  retrieveLinkPageOptions,
  updateLinkPageOptions,
} from '@app/dashboard/link-pages/link-pages-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {CrupdateLinkPageBody} from '@app/gen/schemas/crupdate-link-page-body';
import {UploadType} from '@app/site-config';
import {ArticleEditor} from '@common/article-editor/article-editor';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Button} from '@shadcn/button/button';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ArrowLeftIcon} from 'lucide-react';
import {Link} from 'react-router';
import {FormProvider, useForm} from 'react-hook-form';

export function Component() {
  const {routeType} = useDatatableRouteType();
  const {trans} = useTrans();
  const navigate = useNavigate();
  const {pageId} = useRequiredParams(['pageId']);
  const query = useSuspenseQuery(retrieveLinkPageOptions(Number(pageId)));
  const page = query.data.data;

  const updatePage = useMutation(updateLinkPageOptions(Number(pageId)));
  const form = useForm<CrupdateLinkPageBody>({
    defaultValues: {
      title: page.title ?? '',
      body: page.body,
    },
  });

  const handleSave = () => {
    updatePage.mutate(form.getValues(), {
      onSuccess: () => {
        toast.success(<Trans message="Page updated" />);
        navigate(`/${routeType}/link-pages`);
      },
      onError: err => onFormQueryError(err, form, [], true),
    });
  };

  const saveButton = (
    <Button
      variant="default"
      color="primary"
      onClick={() => handleSave()}
      disabled={updatePage.isPending}
    >
      <Trans message="Save changes" />
    </Button>
  );


  return (
    <>
      <StaticPageTitle>{page.title}</StaticPageTitle>
      <FormProvider {...form}>
        <ArticleEditor
          title={<Trans message="Edit link page" />}
          backButton={
            <Button variant="ghost" size="icon-sm" className="max-lg:size-11" nativeButton={false}
              aria-label={trans({message: 'Back to link pages'})}
              render={<Link to={`/${routeType}/link-pages`} />}>
              <ArrowLeftIcon className="rtl:rotate-180" aria-hidden="true" />
            </Button>
          }
          saveButton={saveButton}
          imageUploadType={UploadType.articleImages}
          initialContent={page.body}
          onChange={value => {
            form.setValue('body', value, {shouldDirty: true});
          }}
        />
      </FormProvider>
    </>
  );
}
