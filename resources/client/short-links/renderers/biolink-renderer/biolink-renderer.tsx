import {CreatorProfileConfig} from '@app/dashboard/stores/store-editor/creator-profile-types';
import {StorePreviewSection} from '@app/dashboard/stores/store-editor/store-preview-protocol';
import {Biolink} from '@app/gen/schemas/biolink';
import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {BiolinkLayout} from '@app/short-links/renderers/biolink-renderer/biolink-layout';

export function BiolinkRenderer({
  biolink,
  appearance,
  content,
  profileConfig,
  preview = false,
  previewSection,
}: {
  biolink: Biolink;
  appearance?: BiolinkAppearanceConfig | null;
  content?: NonNullable<Biolink['content']>;
  profileConfig?: CreatorProfileConfig;
  /** Inside the editor's phone frame: the page renders as live minus ads. */
  preview?: boolean;
  /** Section the editor's current tab maps to; only set in preview mode. */
  previewSection?: StorePreviewSection;
}) {
  return (
    <BiolinkLayout
      biolink={biolink}
      appearance={appearance}
      content={content}
      profileConfig={profileConfig}
      enableLinkAnimations
      showAds={!preview}
      previewSection={previewSection}
    />
  );
}
