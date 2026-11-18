import {ColorSchemeContext} from '@common/core/color-scheme-provider';
import {Button} from '@shadcn/button/button';
import {useSettings} from '@ui/settings/use-settings';
import {MoonIcon, SunIcon} from 'lucide-react';
import {use} from 'react';

export function NavbarColorSchemeToggle() {
  const {themes} = useSettings();
  const {colorScheme, setColorScheme} = use(ColorSchemeContext);

  if (!themes?.user_change) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        setColorScheme(colorScheme === 'light' ? 'dark' : 'light');
      }}
      aria-label={
        colorScheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
      }
    >
      {colorScheme === 'light' ? <MoonIcon /> : <SunIcon />}
    </Button>
  );
}
