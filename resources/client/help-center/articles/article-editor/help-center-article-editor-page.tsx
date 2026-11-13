import {UploadType} from '@app/site-config';
import LegacyArticleEditorPage from '@common/article-editor/article-editor-page';
import {ArticleEditorHeader} from '@common/article-editor/article-editor-sticky-header';
import {ArticleEditorMenubar} from '@common/article-editor/article-editor-menubar';
import {articleEditorTipTapExtensions} from '@common/article-editor/article-editor-tiptap-extensions';
import {ArticleEditorTitle} from '@common/article-editor/article-editor-title';
import {TiptapEditorContent} from '@common/text-editor/tiptap-editor-content';
import {TipTapEditorProvider} from '@common/text-editor/tiptap-editor-provider';
import {DashboardLayout as AdminDashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext as AgentDashboardLayoutContext} from '@common/ui/dashboard-layout/dashboard-layout-context';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useContext, type ReactNode} from 'react';

interface Props {
  initialContent?: string;
  onChange?: (value: string) => void;
  title?: ReactNode;
  saveButton?: ReactNode;
  imageUploadType?: keyof typeof UploadType;
  aside?: ReactNode;
}

/**
 * HC editors are used by both agents and administrators. Agents retain their
 * existing BeDesk editor, while administrators stay in the shared dashboard
 * sidebar with a responsive, inline article details panel.
 */
export default function HelpCenterArticleEditorPage(props: Props) {
  const legacyAgentLayout = useContext(AgentDashboardLayoutContext);
  if (legacyAgentLayout) {
    return <LegacyArticleEditorPage {...props} />;
  }
  return <AdminArticleEditorPage {...props} />;
}

function AdminArticleEditorPage({
  initialContent,
  onChange,
  title,
  saveButton,
  aside,
  imageUploadType = 'articleImages',
}: Props) {
  const {trans} = useTrans();
  return (
    <TipTapEditorProvider
      extensions={articleEditorTipTapExtensions}
      initialContent={initialContent}
      onChange={onChange}
    >
      <FileUploadProvider>
        <AdminDashboardLayout.MainSection>
          <ArticleEditorHeader saveButton={saveButton}>
            {title}
          </ArticleEditorHeader>
          <ArticleEditorMenubar imageUploadType={imageUploadType} />
          <AdminDashboardLayout.SectionContent className="overflow-y-auto">
            <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="min-w-0 rounded-card border bg-card px-3 py-4 sm:px-6">
                <ArticleEditorTitle />
                <TiptapEditorContent className="prose mx-auto min-h-64 w-full max-w-none dark:prose-invert" />
              </div>
              {aside && (
                <aside
                  aria-label={trans({message: 'Details'})}
                  className="min-w-0 self-start overflow-hidden rounded-card border bg-card"
                >
                  <div className="border-b px-4 py-3 text-sm font-semibold">
                    <Trans message="Details" />
                  </div>
                  <div className="p-4">{aside}</div>
                </aside>
              )}
            </div>
          </AdminDashboardLayout.SectionContent>
        </AdminDashboardLayout.MainSection>
      </FileUploadProvider>
    </TipTapEditorProvider>
  );
}
