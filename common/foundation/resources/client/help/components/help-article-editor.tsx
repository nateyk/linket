import {articleEditorTipTapExtensions} from '@common/article-editor/article-editor-tiptap-extensions';
import {HistoryButtons} from '@common/text-editor/history-buttons';
import {AlignButtons} from '@common/text-editor/menubar/align-buttons';
import {ClearFormatButton} from '@common/text-editor/menubar/clear-format-button';
import {CodeBlockMenuTrigger} from '@common/text-editor/menubar/code-block-menu-trigger';
import {Divider} from '@common/text-editor/menubar/divider';
import {FontStyleButtons} from '@common/text-editor/menubar/font-style-buttons';
import {FormatDropdown} from '@common/text-editor/menubar/format-dropdown';
import {LinkButton} from '@common/text-editor/menubar/link-button';
import {ListButtons} from '@common/text-editor/menubar/list-buttons';
import {TiptapEditorContent} from '@common/text-editor/tiptap-editor-content';
import {TipTapEditorProvider} from '@common/text-editor/tiptap-editor-provider';

interface Props {
  value: string;
  onChange: (html: string) => void;
}

export function HelpArticleEditor({value, onChange}: Props) {
  return (
    <div className="overflow-hidden rounded-card border bg-background">
      <TipTapEditorProvider
        extensions={articleEditorTipTapExtensions}
        initialContent={value}
        onChange={onChange}
      >
        <div className="no-scrollbar flex shrink-0 items-center overflow-x-auto border-b px-1 py-0.5 text-muted-foreground">
          <FormatDropdown />
          <Divider />
          <FontStyleButtons />
          <Divider />
          <AlignButtons />
          <Divider />
          <ListButtons />
          <Divider />
          <LinkButton />
          <Divider />
          <CodeBlockMenuTrigger />
          <ClearFormatButton />
          <Divider />
          <HistoryButtons />
        </div>
        <TiptapEditorContent className="prose max-w-none p-4 focus:outline-none dark:prose-invert [&_.tiptap]:min-h-60" />
      </TipTapEditorProvider>
    </div>
  );
}
