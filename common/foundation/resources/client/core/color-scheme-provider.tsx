import { themeEl } from '@ui/root-el';
import { useSettings } from '@ui/settings/use-settings';
import { usePreferredColorScheme } from '@ui/themes/use-preferred-color-scheme';
import { getCurrentThemeValue } from '@ui/themes/utils/get-current-theme-value';
import { useCookie } from '@ui/utils/hooks/use-cookie';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

type ColorScheme = 'dark' | 'light' | 'system';

export interface ColorSchemeContextValue {
  colorScheme: Omit<ColorScheme, 'system'>;
  setColorScheme: (colorScheme: ColorScheme) => void;
}

export const ColorSchemeContext = createContext<ColorSchemeContextValue>(null!);

export function ColorSchemeProvider({
  children,
  cookieName,
}: {
  children: any;
  cookieName?: string;
}) {
  const {themes} = useSettings();
  const [appliedScheme, setAppliedScheme] = useState<
    Omit<ColorScheme, 'system'>
  >(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  const adminSelectedDefaultScheme: ColorScheme =
    themes?.default_scheme ?? 'system';
  const userPreferredColorScheme = usePreferredColorScheme();
  const defaultScheme: Omit<ColorScheme, 'system'> =
    adminSelectedDefaultScheme === 'system'
      ? userPreferredColorScheme
      : adminSelectedDefaultScheme;
  const [schemeCookie, setCurrentSchemeCookie] = useCookie(
    cookieName ?? 'be-color-scheme',
  );
  const selectedScheme =
    schemeCookie === 'light' || schemeCookie === 'dark'
      ? schemeCookie
      : defaultScheme;

  const setColorScheme = useCallback(
    (scheme: ColorScheme) => {
      setCurrentSchemeCookie(scheme);
      const colorScheme =
        scheme === 'light' || scheme === 'dark'
          ? scheme
          : userPreferredColorScheme;
      setAppliedScheme(colorScheme);
      applyColorSchemeToDom(colorScheme);
    },
    [setCurrentSchemeCookie, userPreferredColorScheme],
  );

  // if selected theme is different then the one that was set
  // with server render, set new css variables, this will only
  // happen if user has not selected theme manually and default theme is set to "system"
  useEffect(() => {
    if (appliedScheme !== selectedScheme) {
      setAppliedScheme(selectedScheme);
      applyColorSchemeToDom(selectedScheme);
    }
  }, [selectedScheme, appliedScheme]);

  const contextValue: ColorSchemeContextValue = useMemo(() => {
    return {
      colorScheme: appliedScheme,
      setColorScheme,
    };
  }, [appliedScheme, setColorScheme]);

  return (
    <ColorSchemeContext.Provider value={contextValue}>
      {children}
    </ColorSchemeContext.Provider>
  );
}

export function applyColorSchemeToDom(scheme: Omit<ColorScheme, 'system'>) {
  if (scheme === 'dark') {
    themeEl.classList.add('dark');
    themeEl.classList.remove('light');
  } else {
    themeEl.classList.remove('dark');
    themeEl.classList.add('light');
  }

  const themeColorMetaEl = document.querySelector('meta[name="theme-color"]');
  if (themeColorMetaEl) {
    themeColorMetaEl.setAttribute('content', getCurrentThemeValue('--be-background'));
  }
}
