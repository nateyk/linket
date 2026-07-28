import {Biolink} from '@app/gen/schemas/biolink';
import {BiolinkLayout} from '@app/short-links/renderers/biolink-renderer/biolink-layout';

export function BiolinkRenderer({biolink}: {biolink: Biolink}) {
  return <BiolinkLayout biolink={biolink} enableLinkAnimations showAds />;
}
