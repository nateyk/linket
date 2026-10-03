import {CreatorProfileConfig} from '@app/dashboard/stores/store-editor/creator-profile-types';
import {Biolink} from '@app/gen/schemas/biolink';
import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {BiolinkLayout} from '@app/short-links/renderers/biolink-renderer/biolink-layout';

export function BiolinkRenderer({
  biolink,
  appearance,
  content,
  profileConfig,
  preview = false,
}: {
  biolink: Biolink;
  appearance?: BiolinkAppearanceConfig | null;
  content?: NonNullable<Biolink['content']>;
  profileConfig?: CreatorProfileConfig;
  /** Inside the editor's phone frame: the page renders as live minus ads. */
  preview?: boolean;
}) {
  return (
    <BiolinkLayout
      biolink={biolink}
      appearance={appearance}
      content={content}
      profileConfig={profileConfig}
      enableLinkAnimations
      showAds={!preview}
    />
  );
}
