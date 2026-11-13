import {ArticleEditorAside} from '@app/help-center/articles/article-editor/article-editor-aside';
import {useHcManagerBasePath} from '@app/help-center/manager/hc-manager-paths';
import {HcArticleEditorBreadcrumb} from '@app/help-center/articles/article-editor/hc-article-editor-breadcrumb';
import {
  CreateArticlePayload,
  useCreateArticle,
} from '@app/help-center/articles/requests/use-create-article';
import {UploadType} from '@app/site-config';
import ArticleEditorPage from '@common/article-editor/article-editor-page';
import {useAuth} from '@common/auth/use-auth';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {BreadcrumbItem} from '@ui/breadcrumbs/breadcrumb-item';
import {Button} from '@ui/buttons/button';
import {FormSwitch} from '@ui/forms/toggle/switch';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import {FormProvider, useForm} from 'react-hook-form';
import {useParams} from 'react-router';
import {Fragment} from 'react/jsx-runtime';

export function Component() {
  const {aiAgentId} = useParams();
  const {sectionId} = useParams();
  const navigate = useNavigate();
  const root = useHcManagerBasePath();
  const {trans} = useTrans();
  const {user} = useAuth();
  const form = useForm<CreateArticlePayload>({
    defaultValues: {
      title: '',
      body: '',
      draft: true,
      visibility: 'public',
      attachments: [],
      sections: sectionId ? [parseInt(sectionId)] : [],
      author_id: user?.id,
      visible_to_role: '' as any,
      managed_by_role: '' as any,
    },
  });

  const createArticle = useCreateArticle(form);
  const handleSave = () => {
    createArticle.mutate(
      {
        ...form.getValues(),
        aiAgentId,
      },
      {
        onSuccess: response => {
          toast(trans(message('Article created')));
          navigate(`${root}/articles/${response.article.id}/edit`, {
            replace: true,
          });
        },
      },
    );
  };

  const saveButton = (
    <Button
      variant="flat"
      color="primary"
      size="xs"
      onClick={() => handleSave()}
      disabled={createArticle.isPending}
    >
      <Trans message="Create" />
    </Button>
  );

  const breadCrumb = (
    <HcArticleEditorBreadcrumb>
      <BreadcrumbItem>
        <Trans message="New" />
      </BreadcrumbItem>
    </HcArticleEditorBreadcrumb>
  );

  return (
    <Fragment>
      <StaticPageTitle>
        <Trans message="New article" />
      </StaticPageTitle>
      <FormProvider {...form}>
        <ArticleEditorPage
          imageUploadType={UploadType.articleImages}
          saveButton={saveButton}
          title={breadCrumb}
          aside={
            <ArticleEditorAside>
              <div className="mb-24">
                <div className="mb-8 text-sm font-semibold">
                  <Trans message="Publication status" />
                </div>
                <FormSwitch name="draft" className="mb-0">
                  <Trans message="Save as draft" />
                </FormSwitch>
              </div>
            </ArticleEditorAside>
          }
          onChange={value => {
            form.setValue('body', value, {shouldDirty: true});
          }}
        />
      </FormProvider>
    </Fragment>
  );
}
