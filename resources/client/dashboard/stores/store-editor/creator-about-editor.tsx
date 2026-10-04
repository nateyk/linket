import {creatorAboutExtensions} from '@app/dashboard/stores/store-editor/creator-about-extensions';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {ClearFormatButton} from '@common/text-editor/menubar/clear-format-button';
import {Divider} from '@common/text-editor/menubar/divider';
import {FontStyleButtons} from '@common/text-editor/menubar/font-style-buttons';
import {LinkButton as EditorLinkButton} from '@common/text-editor/menubar/link-button';
import {ListButtons} from '@common/text-editor/menubar/list-buttons';
import {TiptapEditorContent} from '@common/text-editor/tiptap-editor-content';
import {TipTapEditorProvider} from '@common/text-editor/tiptap-editor-provider';
import {useCurrentTextEditor} from '@common/text-editor/tiptap-editor-context';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ChevronDownIcon} from 'lucide-react';

/**
 * TipTap editor for the creator profile's About HTML. `onEditorReady` reports
 * the editor's canonical serialization of `value` as soon as it is created —
 * before any user interaction — so callers can rebase a pristine form default
 * to it and never mistake the mount-time round-trip for an edit (A-01).
 */
export function CreatorAboutEditor({
  value,
  onChange,
  onEditorReady,
}: {
  value: string;
  onChange: (value: string) => void;
  onEditorReady?: (canonicalHtml: string) => void;
}) {
  const {trans} = useTrans();
  return (
    <TipTapEditorProvider
      extensions={creatorAboutExtensions}
      initialContent={value}
      onChange={onChange}
      onCreate={({editor}) => onEditorReady?.(editor.getHTML())}
    >
      <div className="overflow-hidden rounded-card-sm border bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
        <div
          role="toolbar"
          aria-label={trans({message: 'Text formatting'})}
          className="no-scrollbar flex items-center gap-0.5 overflow-x-auto border-b px-1.5 py-1 text-muted-foreground"
        >
          <AboutFormatDropdown />
          <Divider />
          <FontStyleButtons />
          <Divider />
          <ListButtons />
          <Divider />
          <EditorLinkButton />
          <Divider />
          <ClearFormatButton />
        </div>
        <TiptapEditorContent className="prose prose-sm min-h-52 max-w-none px-3.5 py-3 text-foreground dark:prose-invert" />
      </div>
    </TipTapEditorProvider>
  );
}

function AboutFormatDropdown() {
  const editor = useCurrentTextEditor();

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        render={
          <Button type="button" variant="ghost" size="sm" disabled={!editor} />
        }
      >
        <Trans message="Format" />
        <ChevronDownIcon data-icon="inline-end" />
      </Dropdown.Trigger>
      <Dropdown.Content>
        <Dropdown.Item
          onClick={() => editor?.chain().focus().setParagraph().run()}
        >
          <Trans message="Paragraph" />
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() =>
            editor?.chain().focus().toggleHeading({level: 2}).run()
          }
        >
          <Trans message="Heading :number" values={{number: 2}} />
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() =>
            editor?.chain().focus().toggleHeading({level: 3}).run()
          }
        >
          <Trans message="Heading :number" values={{number: 3}} />
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <Trans message="Blockquote" />
        </Dropdown.Item>
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
