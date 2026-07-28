import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {CssTheme} from '@ui/themes/css-theme';
import {ChevronDownIcon} from 'lucide-react';

interface Props {
  selectedThemeId: number;
  onSelectionChange: (themeId: number) => void;
  allThemes: CssTheme[];
}
export function SelectThemeButton({
  selectedThemeId,
  onSelectionChange,
  allThemes,
}: Props) {
  const selectedTheme = allThemes.find(t => t.id === selectedThemeId);

  return (
    <Dropdown.Root>
      <Dropdown.Trigger
        render={
          <Button variant="outline" className="min-w-32 justify-between" />
        }
      >
        {selectedTheme?.name}
        <ChevronDownIcon data-icon="inline-end" />
      </Dropdown.Trigger>
      <Dropdown.Content side="bottom" align="start" sideOffset={8}>
        <Dropdown.RadioGroup
          value={String(selectedThemeId)}
          onValueChange={value => onSelectionChange(Number(value))}
        >
          {allThemes.map(theme => (
            <Dropdown.RadioItem key={theme.id} value={String(theme.id)}>
              {theme.name}
            </Dropdown.RadioItem>
          ))}
        </Dropdown.RadioGroup>
      </Dropdown.Content>
    </Dropdown.Root>
  );
}
