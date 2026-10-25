import {getSettingsPreviewMode} from '@common/admin/settings/preview/use-settings-preview-mode';
import {useEffect} from 'react';

function isHelpCenterPublicPath(): boolean {
  const {pathname} = window.location;
  return (
    pathname === '/help' ||
    pathname.startsWith('/help/') ||
    pathname === '/hc' ||
    pathname.startsWith('/hc/')
  );
}

export function useSuppressHcLegacyCustomHtml(): void {
  useEffect(() => {
    if (!isHelpCenterPublicPath()) {
      return;
    }

    const {isInsideSettingsPreview} = getSettingsPreviewMode();
    if (isInsideSettingsPreview) {
      return;
    }

    document.querySelector('#be-custom-code')?.remove();
  }, []);
}
