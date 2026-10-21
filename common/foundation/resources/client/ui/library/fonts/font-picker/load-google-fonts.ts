import lazyLoader from '@ui/utils/loaders/lazy-loader';
import {isBrowserSafeFont} from '@ui/fonts/font-picker/browser-safe-fonts';
import {FontConfig} from '@ui/fonts/font-picker/font-config';

export function loadGoogleFonts(fonts: FontConfig[], id: string) {
  const googleFonts = fonts.filter(
    font => font.google && !isBrowserSafeFont(font),
  );
  if (googleFonts?.length) {
    const families = googleFonts.map(f => `${f.family}:400`).join('|');
    lazyLoader.loadAsset(
      `https://fonts.googleapis.com/css?family=${families}&display=swap`,
      {type: 'css', id},
    );
  }
}
