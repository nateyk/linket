import {UploadType} from '@app/site-config';
import {ArticleEditorMenubar} from '@common/article-editor/article-editor-menubar';
import {articleEditorTipTapExtensions} from '@common/article-editor/article-editor-tiptap-extensions';
import {ArticleEditorTitle} from '@common/article-editor/article-editor-title';
import {HistoryButtons} from '@common/text-editor/history-buttons';
import {ModeButton} from '@common/text-editor/mode-button';
import {TiptapEditorContent} from '@common/text-editor/tiptap-editor-content';
import {TipTapEditorProvider} from '@common/text-editor/tiptap-editor-provider';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {
  FileUploadProvider,
  useFileUploadStore,
} from '@common/uploads/uploader/file-upload-provider';
import FileHandler from '@tiptap/extension-file-handler';
import type {Editor} from '@tiptap/react';
import {getImageSize} from '@ui/utils/files/get-image-size';
import {ReactNode, use, useMemo} from 'react';

interface Props {
  initialContent?: string;
  onChange?: (value: string) => void;
  title: ReactNode;
  saveButton: ReactNode;
  imageUploadType: keyof typeof UploadType;
  rightSidebar?: ReactNode;
}
export function ArticleEditor(props: Props) {
  return (
    <FileUploadProvider>
      <Content {...props} />
    </FileUploadProvider>
  );
}

function Content({
  imageUploadType,
  initialContent,
  onChange,
  saveButton,
  title,
  rightSidebar,
}: Props) {
  const {rightSidebar: rightSidebarState} = use(DashboardLayoutContext);

  const uploadMultiple = useFileUploadStore(s => s.uploadMultiple);
  const articleExtensions = useMemo(() => {
    const handleImageUpload = (files: File[], editor: Editor, pos?: number) => {
      uploadMultiple(files, {
        uploadType: imageUploadType,
        showToastOnRestrictionFail: true,
        onSuccess: async (entry, file) => {
          const size = await getImageSize(file.native);
          editor
            .chain()
            .insertContentAt(pos ?? editor.state.selection.anchor, {
              type: 'image',
              attrs: {
                src: entry.url,
                width: size.width,
                height: size.height,
              },
            })
            .focus()
            .run();
        },
      });
    };

    return [
      ...articleEditorTipTapExtensions,
      FileHandler.configure({
        onDrop: (editor: Editor, files: File[], pos: number) => {
          handleImageUpload(files, editor, pos);
        },
        onPaste: (editor: Editor, files: File[]) => {
          handleImageUpload(files, editor);
        },
      }),
    ];
  }, [uploadMultiple, imageUploadType]);

  return (
    <TipTapEditorProvider
      extensions={articleExtensions}
      initialContent={initialContent}
      onChange={onChange}
    >
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle>{title}</DashboardLayout.SectionTitle>
          <HistoryButtons />
          <ModeButton />
          {saveButton}
          {rightSidebar && rightSidebarState.status === 'collapsed' && (
            <DashboardLayout.SidebarToggle sidebar="right" />
          )}
        </DashboardLayout.SectionHeader>
        <ArticleEditorMenubar imageUploadType={imageUploadType} />
        <div className="flex-1 overflow-y-auto">
          <ArticleEditorTitle />
          <TiptapEditorContent className="mx-auto prose flex-auto px-6 dark:prose-invert" />
        </div>
      </DashboardLayout.MainSection>
      {rightSidebar}
    </TipTapEditorProvider>
  );
}
