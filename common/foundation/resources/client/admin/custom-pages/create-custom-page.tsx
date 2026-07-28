import {CreateCustomPageBody} from '@app/gen/schemas/create-custom-page-body';
import {UploadType} from '@app/site-config';
import {createCustomPageOptions} from '@common/admin/custom-pages/custom-pages-queries';
import {ArticleEditor} from '@common/article-editor/article-editor-page';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {Fragment} from 'react';
import {FormProvider, useForm} from 'react-hook-form';

export function Component() {
  const navigate = useNavigate();
  const createPage = useMutation(createCustomPageOptions());
  const form = useForm<CreateCustomPageBody>();

  const handleSave = () => {
    createPage.mutate(form.getValues(), {
      onSuccess: () => {
        toast.success(<Trans message="Page created" />);
        navigate('../', {relative: 'path'});
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  const saveButton = (
    <Button
      color="primary"
      size="sm"
      onClick={() => handleSave()}
      disabled={createPage.isPending}
    >
      <Trans message="Create" />
    </Button>
  );

  const breadCrumb = (
    <Breadcrumb.Root className="text-xl">
      <Breadcrumb.Item>
        <Breadcrumb.Link to=".." relative="path">
          <Trans message="Custom pages" />
        </Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>
          <Trans message="New page" />
        </Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.Root>
  );

  return (
    <Fragment>
      <StaticPageTitle>
        <Trans message="New custom page" />
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
    </Fragment>
  );
}
