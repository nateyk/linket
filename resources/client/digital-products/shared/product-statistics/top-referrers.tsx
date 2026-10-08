import {Card} from '@shadcn/card/card';
import {Empty} from '@shadcn/empty/empty';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {Trans} from '@ui/i18n/trans';
import {ArrowUpRightIcon} from 'lucide-react';
import {ProductStatistics} from './queries';

interface TopReferrersProps {
  items: ProductStatistics['top_referrers'];
}

export function TopReferrers({items}: TopReferrersProps) {
  return (
    <Card size="sm" className="min-w-0">
      <Card.Header>
        <Card.Title>
          <Trans message="Top referrers" />
        </Card.Title>
      </Card.Header>
      <Card.Content className="flex min-w-0 flex-col gap-2">
        {items.length ? (
          items.map(item => (
            <div
              key={item.referrer}
              className="flex items-center gap-3 rounded-card-sm px-3 py-2.5 odd:bg-muted/50"
            >
              <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {item.referrer}
              </div>
              <div className="font-semibold tabular-nums">
                <FormattedNumber value={item.views_count} />
              </div>
            </div>
          ))
        ) : (
          <Empty className="min-h-44 border-0 p-6">
            <Empty.Header>
              <Empty.Media variant="icon">
                <ArrowUpRightIcon />
              </Empty.Media>
              <Empty.Title>
                <Trans message="No referrers in this period" />
              </Empty.Title>
            </Empty.Header>
          </Empty>
        )}
      </Card.Content>
    </Card>
  );
}