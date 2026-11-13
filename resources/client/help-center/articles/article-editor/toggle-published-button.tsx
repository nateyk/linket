import {UpdateArticlePageData} from '@app/help-center/articles/article-editor/update-article-page-data';
import {
  UpdateArticlePayload,
  useUpdateArticle,
} from '@app/help-center/articles/requests/use-update-article';
import {Button} from '@ui/buttons/button';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useFormContext} from 'react-hook-form';

interface Props {
  article: UpdateArticlePageData['article'];
  isSaving?: boolean;
}

export function TogglePublishedButton({article, isSaving = false}: Props) {
  const updateArticle = useUpdateArticle();
  const {formState} = useFormContext<UpdateArticlePayload>();
  const {trans} = useTrans();
  const hasUnsavedChanges = formState.isDirty;

  return (
    <div className="flex min-w-0 flex-col items-start gap-4">
      <Button
        variant="link"
        color="primary"
        disabled={updateArticle.isPending || isSaving || hasUnsavedChanges}
        title={
          hasUnsavedChanges
            ? trans({message: 'Save changes before changing publication status'})
            : undefined
        }
        onClick={() => {
          updateArticle.mutate({
            id: article.id,
            draft: !article.draft,
          });
        }}
      >
        {article.draft ? (
          <Trans message="Publish" />
        ) : (
          <Trans message="Unpublish" />
        )}
      </Button>
      {hasUnsavedChanges && (
        <p role="status" className="max-w-80 text-xs text-muted-foreground">
          <Trans message="Save changes before changing publication status" />
        </p>
      )}
    </div>
  );
}
