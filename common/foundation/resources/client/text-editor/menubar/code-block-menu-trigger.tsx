import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useEditorState} from '@tiptap/react';
import {Trans} from '@ui/i18n/trans';
import {CodeIcon} from 'lucide-react';
import {useCurrentTextEditor} from '../tiptap-editor-context';

const languages = [
  {value: 'html', label: 'HTML'},
  {value: 'javascript', label: 'JavaScript'},
  {value: 'css', label: 'CSS'},
  {value: 'php', label: 'PHP'},
  {value: 'shell', label: 'Shell'},
  {value: 'bash', label: 'Bash'},
  {value: 'ruby', label: 'Ruby'},
  {value: 'python', label: 'Python'},
  {value: 'java', label: 'Java'},
  {value: 'c++', label: 'C++'},
] as const;

export function CodeBlockMenuTrigger() {
  const editor = useCurrentTextEditor();

  const state = useEditorState({
    editor,
    selector: snapshot => ({
      language: snapshot.editor?.getAttributes('codeBlock').language || '',
    }),
  });

  return (
    <Dropdown.Root>
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <Dropdown.Trigger
              render={
                <Button
                  variant="ghost"
                  color={state?.language ? 'primary' : 'default'}
                  disabled={!editor}
                />
              }
            />
          }
        >
          <CodeIcon />
        </Tooltip.Trigger>
        <Tooltip.Content>
          <Trans message="Codeblock" />
        </Tooltip.Content>
      </Tooltip.Root>
      <Dropdown.Content>
        <Dropdown.RadioGroup
          value={state?.language}
          onValueChange={value => {
            editor?.commands.focus();
            editor?.commands.toggleCodeBlock({language: value});
          }}
        >
          {languages.map(({value, label}) => (
            <Dropdown.RadioItem key={value} value={value}>
              {label}
            </Dropdown.RadioItem>
          ))}
        </Dropdown.RadioGroup>
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
