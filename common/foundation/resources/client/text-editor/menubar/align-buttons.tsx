import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {useEditorState} from '@tiptap/react';
import {Trans} from '@ui/i18n/trans';
import {
  AlignLeftIcon,
  AlignRightIcon,
  TextAlignCenterIcon,
  TextAlignJustifyIcon,
} from 'lucide-react';
import {useCurrentTextEditor} from '../tiptap-editor-context';

const alignOptions = {
  left: {
    icon: <AlignLeftIcon />,
    label: <Trans message="Align left" />,
  },
  center: {
    icon: <TextAlignCenterIcon />,
    label: <Trans message="Align center" />,
  },
  right: {
    icon: <AlignRightIcon />,
    label: <Trans message="Align right" />,
  },
  justify: {
    icon: <TextAlignJustifyIcon />,
    label: <Trans message="Justify" />,
  },
} as const;

type AlignKey = keyof typeof alignOptions;

export function AlignButtons() {
  const editor = useCurrentTextEditor();
  const state = useEditorState({
    editor,
    selector: snapshot => ({
      activeKey: Object.keys(alignOptions).find(key =>
        snapshot.editor?.isActive({textAlign: key}),
      ) as AlignKey | undefined,
    }),
  });

  const activeKey = state?.activeKey;
  const activeIcon = activeKey
    ? alignOptions[activeKey].icon
    : alignOptions.left.icon;

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        render={
          <Button
            variant="ghost"
            color={activeKey ? 'primary' : 'default'}
            size="icon-sm"
            disabled={!editor}
          />
        }
      >
        {activeIcon}
      </Dropdown.Trigger>
      <Dropdown.Content>
        <Dropdown.RadioGroup
          value={activeKey}
          onValueChange={value => {
            editor?.commands.focus();
            editor?.commands.setTextAlign(value as AlignKey);
          }}
        >
          {Object.entries(alignOptions).map(([name, config]) => (
            <Dropdown.RadioItem key={name} value={name}>
              {config.icon}
              {config.label}
            </Dropdown.RadioItem>
          ))}
        </Dropdown.RadioGroup>
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
