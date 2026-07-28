import {UpdateCustomPageBody} from '@app/gen/schemas/update-custom-page-body';
import {UploadType} from '@app/site-config';
import {
  retrieveCustomPageOptions,
  updateCustomPageOptions,
} from '@common/admin/custom-pages/custom-pages-queries';
import {ArticleEditor} from '@common/article-editor/article-editor-page';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {FormProvider, useForm} from 'react-hook-form';
import {Fragment} from 'react/jsx-runtime';

export function Component() {
  const {pageId} = useRequiredParams(['pageId']);
  const query = useSuspenseQuery(retrieveCustomPageOptions(pageId));
  const page = query.data.data;

  const navigate = useNavigate();
  const updatePage = useMutation(updateCustomPageOptions(Number(pageId)));
  const form = useForm<UpdateCustomPageBody>({
    defaultValues: {
      title: page.title ?? '',
      slug: page.slug,
      body: page.body,
    },
  });

  const handleSave = () => {
    updatePage.mutate(form.getValues(), {
      onSuccess: () => {
        toast.success(<Trans message="Page updated" />);
        navigate('../..', {relative: 'path'});
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  const saveButton = (
    <Button
      color="primary"
      size="sm"
      onClick={() => handleSave()}
      disabled={updatePage.isPending}
    >
      <Trans message="Save" />
    </Button>
  );

  const breadCrumb = (
    <Breadcrumb.Root className="text-xl">
      <Breadcrumb.Item>
        <Breadcrumb.Link to="../.." relative="path">
          <Trans message="Custom pages" />
        </Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>
          <Trans message="Edit" />
        </Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.Root>
  );

  return (
    <Fragment>
      <StaticPageTitle>
        {page.title ?? <Trans message="Edit custom page" />}
      </StaticPageTitle>
      <FormProvider {...form}>
        <ArticleEditor
          title={breadCrumb}
          saveButton={saveButton}
          imageUploadType={UploadType.articleImages}
          initialContent={page.body}
          onChange={value => {
            form.setValue('body', value, {shouldDirty: true});
          }}
        />
      </FormProvider>
    </Fragment>
  );
}
