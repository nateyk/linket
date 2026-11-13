import {createLinkPageOptions} from '@app/dashboard/link-pages/link-pages-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {CrupdateLinkPageBody} from '@app/gen/schemas/crupdate-link-page-body';
import {UploadType} from '@app/site-config';
import {ArticleEditor} from '@common/article-editor/article-editor';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {Button} from '@shadcn/button/button';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ArrowLeftIcon} from 'lucide-react';
import {Link} from 'react-router';
import {FormProvider, useForm} from 'react-hook-form';

export function Component() {
  const {routeType} = useDatatableRouteType();
  const {trans} = useTrans();
  const navigate = useNavigate();

  const createPage = useMutation(createLinkPageOptions());
  const form = useForm<CrupdateLinkPageBody>();

  const handleSave = () => {
    createPage.mutate(form.getValues(), {
      onSuccess: () => {
        toast.success(<Trans message="Page created" />);
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
      disabled={createPage.isPending}
    >
      <Trans message="Create" />
    </Button>
  );


  return (
    <>
      <StaticPageTitle>
        <Trans message="New link page" />
      </StaticPageTitle>
      <FormProvider {...form}>
        <ArticleEditor
          imageUploadType={UploadType.articleImages}
          saveButton={saveButton}
          title={<Trans message="New link page" />}
          backButton={
            <Button variant="ghost" size="icon-sm" className="max-lg:size-11" nativeButton={false}
              aria-label={trans({message: 'Back to link pages'})}
              render={<Link to={`/${routeType}/link-pages`} />}>
              <ArrowLeftIcon className="rtl:rotate-180" aria-hidden="true" />
            </Button>
          }
          onChange={value => {
            form.setValue('body', value, {shouldDirty: true});
          }}
        />
      </FormProvider>
    </>
  );
}
