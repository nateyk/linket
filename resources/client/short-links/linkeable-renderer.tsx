import {Biolink} from '@app/gen/schemas/biolink';
import {Folder} from '@app/gen/schemas/folder';
import {Link as LinkType} from '@app/gen/schemas/link';
import {PasswordPage} from '@app/short-links/password-page';
import {BiolinkRenderer} from '@app/short-links/renderers/biolink-renderer/biolink-renderer';
import {FolderRenderer} from '@app/short-links/renderers/folder-renderer';
import {LinkIframeRenderer} from '@app/short-links/renderers/link-iframe-renderer';
import {LinkOverlayRenderer} from '@app/short-links/renderers/link-overlay-renderer';
import {LinkPageRenderer} from '@app/short-links/renderers/link-page-renderer';
import {LinkSplashRenderer} from '@app/short-links/renderers/link-splash-renderer';
import {NotFoundPage} from '@common/ui/not-found-page/not-found-page';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {useState} from 'react';

type Linkeable = LinkType | Folder | Biolink;

export function Component() {
  const linkeablePage = getBootstrapData().loaders?.linkeablePage;
  return linkeablePage ? (
    <LinkeableRenderer linkeable={linkeablePage.data} />
  ) : (
    <NotFoundPage />
  );
}

export function LinkeableRenderer({linkeable}: {linkeable: Linkeable}) {
  const [passwordValid, setPasswordValid] = useState(!linkeable.password);
  if (linkeable.password && !passwordValid) {
    return (
      <PasswordPage
        linkeable={linkeable}
        onPasswordValid={() => setPasswordValid(true)}
      />
    );
  }

  switch (linkeable.model_type) {
    case 'link':
      return getLinkRenderer(linkeable);
    case 'folder':
      return <FolderRenderer folder={linkeable} />;
    case 'biolink':
      return <BiolinkRenderer biolink={linkeable} />;
    default:
      return <NotFoundPage />;
  }
}

function getLinkRenderer(link: LinkType) {
  switch (link.type) {
    case 'frame':
      return <LinkIframeRenderer link={link} />;
    case 'overlay':
      return <LinkOverlayRenderer link={link} />;
    case 'splash':
      return <LinkSplashRenderer link={link} />;
    case 'page':
      return <LinkPageRenderer link={link} />;
    case 'direct':
      window.location.replace(link.final_destination_url ?? link.long_url);
      return null;
    default:
      return <NotFoundPage />;
  }
}
