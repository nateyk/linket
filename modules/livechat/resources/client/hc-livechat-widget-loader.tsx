import {useIsModuleInstalled} from '@app/use-is-module-installed';
import {useSettingsPreviewMode} from '@common/admin/settings/preview/use-settings-preview-mode';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {useSettings} from '@ui/settings/use-settings';
import lazyLoader from '@ui/utils/loaders/lazy-loader';
import {useEffect} from 'react';
import {useLocation} from 'react-router';

const scriptTagId = 'hc-auto-livechat-loader';

function isHelpCenterPath(pathname: string): boolean {
  return (
    pathname === '/hc' ||
    pathname.startsWith('/hc/') ||
    pathname === '/help' ||
    pathname.startsWith('/help/')
  );
}

function isPublicStorePath(pathname: string): boolean {
  // Public store/bio pages are short-link roots (not /dashboard, /admin, /agent, /api).
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/agent') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/account-settings') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    isHelpCenterPath(pathname)
  ) {
    return false;
  }
  return pathname !== '/' && pathname.length > 1;
}

export function HcLivechatWidgetLoader() {
  const {base_url, hc, homepage, chatWidget} = useSettings() as {
    base_url?: string;
    hc?: {showLivechat?: boolean};
    homepage?: {type?: string};
    chatWidget?: {hide?: boolean};
  };
  const livechatInstalled = useIsModuleInstalled('livechat');
  const {isInsideSettingsPreview} = useSettingsPreviewMode();
  const {pathname} = useLocation();

  const showOnHc =
    Boolean(hc?.showLivechat) &&
    (isHelpCenterPath(pathname) ||
      (pathname === '/' && homepage?.type === 'landingPage'));

  const showOnStore =
    Boolean(livechatInstalled) &&
    !chatWidget?.hide &&
    isPublicStorePath(pathname);

  const shouldLoadLivechat =
    livechatInstalled &&
    !isInsideSettingsPreview &&
    (showOnHc || showOnStore);

  useEffect(() => {
    if (!livechatInstalled || isInsideSettingsPreview) {
      return;
    }

    const url = `${base_url}/livechat-loader.js`;

    if (shouldLoadLivechat) {
      (window as any).BeChatSettings = {
        user: getBootstrapData().livechatWidgetUser,
      };
      lazyLoader.loadAsset(url, {type: 'js', id: scriptTagId});
    } else if ((window as any).BeChat) {
      (window as any).BeChat.destroy();
      lazyLoader.removeLoadedAsset(url);
      document.querySelector(`#${scriptTagId}`)?.remove();
      delete (window as any).BeChatSettings;
    }
  }, [
    pathname,
    isInsideSettingsPreview,
    shouldLoadLivechat,
    livechatInstalled,
    base_url,
  ]);

  return null;
}
