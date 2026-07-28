import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Trans} from '@ui/i18n/trans';
import {ChevronDownIcon} from 'lucide-react';
import {useCurrentTextEditor} from '../tiptap-editor-context';

export function FormatDropdown() {
  const editor = useCurrentTextEditor();

  const focusAndRun = (command: () => void) => {
    editor?.commands.focus();
    command();
  };

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        render={
          <Button
            variant="ghost"
            color="default"
            size="sm"
            disabled={!editor}
          />
        }
      >
        <Trans message="Format" />
        <ChevronDownIcon data-icon="inline-end" />
      </Dropdown.Trigger>
      <Dropdown.Content className="min-w-64">
        <Dropdown.Item
          onClick={() =>
            focusAndRun(() => editor?.commands.toggleHeading({level: 1}))
          }
        >
          <Trans message="Heading :number" values={{number: 1}} />
          <Dropdown.Shortcut>Alt+1</Dropdown.Shortcut>
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() =>
            focusAndRun(() => editor?.commands.toggleHeading({level: 2}))
          }
        >
          <Trans message="Heading :number" values={{number: 2}} />
          <Dropdown.Shortcut>Alt+2</Dropdown.Shortcut>
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() =>
            focusAndRun(() => editor?.commands.toggleHeading({level: 3}))
          }
        >
          <Trans message="Heading :number" values={{number: 3}} />
          <Dropdown.Shortcut>Alt+3</Dropdown.Shortcut>
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() =>
            focusAndRun(() => editor?.commands.toggleHeading({level: 4}))
          }
        >
          <Trans message="Heading :number" values={{number: 4}} />
          <Dropdown.Shortcut>Alt+4</Dropdown.Shortcut>
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => focusAndRun(() => editor?.commands.toggleCode())}
        >
          <Trans message="Code" />
          <Dropdown.Shortcut>Ctrl+E</Dropdown.Shortcut>
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => focusAndRun(() => editor?.commands.toggleStrike())}
        >
          <Trans message="Strikethrough" />
          <Dropdown.Shortcut>Shift+X</Dropdown.Shortcut>
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() =>
            focusAndRun(() => editor?.commands.toggleSuperscript())
          }
        >
          <Trans message="Superscript" />
          <Dropdown.Shortcut>Ctrl+.</Dropdown.Shortcut>
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => focusAndRun(() => editor?.commands.toggleSubscript())}
        >
          <Trans message="Subscript" />
          <Dropdown.Shortcut>Ctrl+,</Dropdown.Shortcut>
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => focusAndRun(() => editor?.commands.toggleBlockquote())}
        >
          <Trans message="Blockquote" />
          <Dropdown.Shortcut>Shift+B</Dropdown.Shortcut>
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => focusAndRun(() => editor?.commands.setParagraph())}
        >
          <Trans message="Paragraph" />
          <Dropdown.Shortcut>Alt+0</Dropdown.Shortcut>
        </Dropdown.Item>
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
