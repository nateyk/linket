import {createLinkPageOptions} from '@app/dashboard/link-pages/link-pages-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {CrupdateLinkPageBody} from '@app/gen/schemas/crupdate-link-page-body';
import {UploadType} from '@app/site-config';
import {ArticleEditor} from '@common/article-editor/article-editor-page';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {FormProvider, useForm} from 'react-hook-form';

export function Component() {
  const {routeType} = useDatatableRouteType();
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

  const breadCrumb = (
    <Breadcrumb.Root className="text-xl">
      <Breadcrumb.Item>
        <Breadcrumb.Link to={`/${routeType}/link-pages`}>
          <Trans message="Link pages" />
        </Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>
          <Trans message="New" />
        </Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.Root>
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
          title={breadCrumb}
          onChange={value => {
            form.setValue('body', value, {shouldDirty: true});
          }}
        />
      </FormProvider>
    </>
  );
}
