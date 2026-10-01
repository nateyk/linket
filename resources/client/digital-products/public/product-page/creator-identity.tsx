import {Avatar} from '@shadcn/avatar/avatar';
import {normalizeMediaUrl} from '@common/uploads/normalize-media-url';
import {Trans} from '@ui/i18n/trans';
import {BadgeCheckIcon} from 'lucide-react';
import type {
  PublicBiolink,
  PublicCreator,
} from '../digital-product-public-pages';

export function resolveCreator({
  creator,
  biolink,
}: {
  creator?: PublicCreator | null;
  biolink: PublicBiolink;
}) {
  const name =
    biolink.profile_config?.display_name || creator?.name || biolink.name;
  const avatar = normalizeMediaUrl(
    biolink.profile_config?.avatar_url || creator?.avatar || '',
  );
  const verified = biolink.is_verified ?? creator?.verified;

  return {name, avatar, verified: !!verified};
}

export function CreatorIdentity({
  creator,
  biolink,
}: {
  creator?: PublicCreator | null;
  biolink: PublicBiolink;
}) {
  const {name, avatar, verified} = resolveCreator({creator, biolink});

  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-[var(--biolink-muted-text)]">
      <Avatar.Root size="sm" className="rounded-card-sm after:rounded-card-sm">
        <Avatar.Image src={avatar} alt="" className="rounded-card-sm" />
        <Avatar.ColorFallback className="rounded-card-sm">
          {name}
        </Avatar.ColorFallback>
      </Avatar.Root>
      <span className="min-w-0 truncate">
        <Trans message="By :creator" values={{creator: name}} />
      </span>
      {verified && (
        <>
          <BadgeCheckIcon className="size-4 fill-current" aria-hidden="true" />
          <span className="sr-only">
            <Trans message="Verified creator" />
          </span>
        </>
      )}
    </div>
  );
}
