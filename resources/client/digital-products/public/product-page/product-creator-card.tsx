import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Trans} from '@ui/i18n/trans';
import {BadgeCheckIcon, StoreIcon} from 'lucide-react';
import type {
  PublicBiolink,
  PublicCreator,
} from '../digital-product-public-pages';
import {resolveCreator} from './creator-identity';
import {biolinkSectionTitle, biolinkSurfaceCard} from './surface';

export function ProductCreatorCard({
  creator,
  biolink,
  storeUrl,
}: {
  creator?: PublicCreator | null;
  biolink: PublicBiolink;
  storeUrl?: string | null;
}) {
  const {name, avatar, verified} = resolveCreator({creator, biolink});

  return (
    <Card.Root className={biolinkSurfaceCard}>
      <Card.Content className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
        <h2 className={biolinkSectionTitle}>
          <Trans message="About the creator" />
        </h2>

        <div className="flex items-start gap-4">
          <Avatar.Root size="lg">
            <Avatar.Image src={avatar} alt="" />
            <Avatar.ColorFallback>{name}</Avatar.ColorFallback>
          </Avatar.Root>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-base font-medium">{name}</span>
            {verified && (
              <Badge variant="positive">
                <BadgeCheckIcon />
                <Trans message="Verified creator" />
              </Badge>
            )}
          </div>
        </div>

        {storeUrl && (
          <Button
            variant="ghost"
            className="w-fit border-[var(--biolink-border)] bg-[var(--biolink-surface)] text-[var(--biolink-text)] hover:bg-[var(--biolink-surface-strong)] hover:text-[var(--biolink-text)]"
            render={<a href={storeUrl} />}
          >
            <StoreIcon data-icon="inline-start" />
            <Trans message="Visit store" />
          </Button>
        )}
      </Card.Content>
    </Card.Root>
  );
}
