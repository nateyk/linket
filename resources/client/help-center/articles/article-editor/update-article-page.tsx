import {ArticleEditorAside} from '@app/help-center/articles/article-editor/article-editor-aside';
import {HcArticleEditorBreadcrumb} from '@app/help-center/articles/article-editor/hc-article-editor-breadcrumb';
import {TogglePublishedButton} from '@app/help-center/articles/article-editor/toggle-published-button';
import {UpdateArticlePageData} from '@app/help-center/articles/article-editor/update-article-page-data';
import {getArticleLink} from '@app/help-center/articles/article-link';
import {
  UpdateArticlePayload,
  useUpdateArticle,
} from '@app/help-center/articles/requests/use-update-article';
import {helpCenterQueries} from '@app/help-center/help-center-queries';
import {UploadType} from '@app/site-config';
import ArticleEditorPage from '@common/article-editor/article-editor-page';
import {Button} from '@ui/buttons/button';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {useSuspenseQuery} from '@tanstack/react-query';
import {BreadcrumbItem} from '@ui/breadcrumbs/breadcrumb-item';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {OpenInNewIcon} from '@ui/icons/material/OpenInNew';
import {toast} from '@ui/toast/toast';
import clsx from 'clsx';
import {Fragment} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {Link, useParams} from 'react-router';

export function Component() {
  const {articleId, categoryId, sectionId} = useParams();
  const query = useSuspenseQuery(
    helpCenterQueries.articles.getForUpdateArticlePage({
      articleId: articleId!,
      categoryId,
      sectionId,
    }),
  );
  const article = query.data.article;

  const {trans} = useTrans();
  const form = useForm<UpdateArticlePayload>({
    defaultValues: {
      title: article.title,
      slug: article.slug,
      visible_to_role: article.visible_to_role || ('' as any),
      managed_by_role: article.managed_by_role || ('' as any),
      author_id: article.author_id,
      sections: article.sections?.map(s => s.id),
      tags: article.tags,
      attachments: article.attachments,
    },
  });

  const updateArticle = useUpdateArticle(form);
  const handleSave = () => {
    updateArticle.mutate(
      {
        ...form.getValues(),
        id: article.id,
      },
      {
        onSuccess: () => {
          // A successful save is the new baseline for subsequent publish actions.
          form.reset(form.getValues());
          toast(trans(message('Article updated')));
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
      disabled={updateArticle.isPending}
    >
      <Trans message="Save" />
    </Button>
  );

  const breadCrumb = (
    <HcArticleEditorBreadcrumb>
      <BreadcrumbItem>
        <Trans message="Edit" />
      </BreadcrumbItem>
    </HcArticleEditorBreadcrumb>
  );

  return (
    <Fragment>
      <StaticPageTitle>{query.data.article.title}</StaticPageTitle>
      <FormProvider {...form}>
        <ArticleEditorPage
          imageUploadType={UploadType.articleImages}
          title={breadCrumb}
          saveButton={saveButton}
          aside={
            <ArticleEditorAside>
              <PublicationStatus article={article} />
            </ArticleEditorAside>
          }
          initialContent={article.body}
          onChange={value => {
            form.setValue('body', value, {shouldDirty: true});
          }}
        />
      </FormProvider>
    </Fragment>
  );
}

interface PublicationStatusProps {
  article: UpdateArticlePageData['article'];
}
export function PublicationStatus({article}: PublicationStatusProps) {
  return (
    <div className="mb-24 border-b pb-20 text-sm">
      <div className="mb-2 font-semibold">
        <Trans message="Publication status" />
      </div>
      <div className="flex flex-wrap items-center gap-x-10 gap-y-8">
        <div role="status" className="flex items-center gap-2 border-r pr-10">
          <div
            className={clsx(
              'h-3 w-3 shrink-0 rounded-full border',
              article.draft
                ? 'border-border'
                : 'border-transparent bg-positive',
            )}
          />
          {article.draft ? (
            <Trans message="Draft" />
          ) : (
            <Trans message="Published" />
          )}
        </div>
        <TogglePublishedButton article={article} />
      </div>
      <Link
        to={getArticleLink(article, {section: article.sections?.[0]})}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-12 inline-flex min-h-32 items-center gap-1 rounded-input text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Trans message="Preview in Help Center" />
        <OpenInNewIcon size="xs" />
      </Link>
    </div>
  );
}
