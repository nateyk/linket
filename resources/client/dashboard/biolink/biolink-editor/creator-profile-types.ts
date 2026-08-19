import {Biolink} from '@app/gen/schemas/biolink';
import {BiolinkBuilderMode} from '@app/gen/schemas/biolink-builder-mode';

export interface CreatorProfileConfig {
  display_name: string;
  profile_title: string;
  headline?: string;
  bio: string;
  about_html: string;
  avatar_url: string;
  cover_url: string;
  available_for_work: boolean;
  skills: string[];
  follow_url: string;
  contact_url: string;
  social_links: Record<string, string>;
}

export function getCreatorProfileConfig(
  biolink: Biolink,
): CreatorProfileConfig {
  const profileConfig =
    biolink.profile_config as typeof biolink.profile_config & {
      profile_title?: string | null;
    };

  return {
    display_name:
      biolink.profile_config?.display_name ||
      biolink.user?.name ||
      biolink.name,
    profile_title: profileConfig?.profile_title || '',
    headline: '',
    bio: biolink.profile_config?.bio || '',
    about_html: biolink.profile_config?.about_html || '',
    avatar_url: biolink.profile_config?.avatar_url || biolink.user?.image || '',
    cover_url: biolink.profile_config?.cover_url || '',
    available_for_work: biolink.profile_config?.available_for_work ?? false,
    skills: (biolink.profile_config?.skills || []).slice(0, 8),
    follow_url: biolink.profile_config?.follow_url || '',
    contact_url: biolink.profile_config?.contact_url || '',
    social_links: biolink.profile_config?.social_links || {},
  };
}

export function isCreatorProfileBiolink(biolink: Biolink): boolean {
  return biolink.builder_mode === BiolinkBuilderMode.creator_profile;
}
