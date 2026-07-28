import {ClearFormatButton} from '@common/text-editor/menubar/clear-format-button';
import {CodeBlockMenuTrigger} from '@common/text-editor/menubar/code-block-menu-trigger';
import {FontStyleButtons} from '@common/text-editor/menubar/font-style-buttons';
import {LinkButton} from '@common/text-editor/menubar/link-button';
import {ListButtons} from '@common/text-editor/menubar/list-buttons';
import {useCurrentTextEditor} from './tiptap-editor-context';

export function TextFormatButtons() {
  const editor = useCurrentTextEditor();

  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 rounded-card border bg-background py-0.5 shadow-sm">
      <FontStyleButtons />
      <Divider />
      <ListButtons />
      <Divider />
      <LinkButton />
      <Divider />
      <CodeBlockMenuTrigger />
      <ClearFormatButton />
    </div>
  );
}

function Divider() {
  return <div className="w-px shrink-0 self-stretch bg-border" />;
}
