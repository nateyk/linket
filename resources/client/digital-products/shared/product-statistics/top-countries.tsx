import {Card} from '@shadcn/card/card';
import {Empty} from '@shadcn/empty/empty';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {GlobeIcon} from 'lucide-react';
import {ProductStatistics} from './queries';

interface TopCountriesProps {
  items: ProductStatistics['top_countries'];
  currency?: string;
}

export function TopCountries({items, currency = 'ETB'}: TopCountriesProps) {
  return (
    <Card size="sm" className="min-w-0">
      <Card.Header>
        <Card.Title>
          <Trans message="Top countries" />
        </Card.Title>
      </Card.Header>
      <Card.Content className="flex min-w-0 flex-col gap-2">
        {items.length ? (
          items.map(item => (
            <div
              key={item.country}
              className="flex items-center gap-3 rounded-card-sm px-3 py-2.5 odd:bg-muted/50"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {item.country.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  <Trans
                    message=":count sales"
                    values={{count: <FormattedNumber value={item.sales_count} />}}
                  />
                </div>
              </div>
              <div className="font-semibold tabular-nums">
                {formatMoney(item.gross_cents, currency)}
              </div>
            </div>
          ))
        ) : (
          <Empty className="min-h-44 border-0 p-6">
            <Empty.Header>
              <Empty.Media variant="icon">
                <GlobeIcon />
              </Empty.Media>
              <Empty.Title>
                <Trans message="No sales in this period" />
              </Empty.Title>
            </Empty.Header>
          </Empty>
        )}
      </Card.Content>
    </Card>
  );
}