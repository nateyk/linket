import {ProductStatistics} from './queries';
import {Card} from '@shadcn/card/card';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {
  CircleDollarSignIcon,
  EyeIcon,
  PercentIcon,
  ShoppingBagIcon,
  WalletCardsIcon,
  type LucideIcon,
} from 'lucide-react';
import {ReactNode} from 'react';

interface KpiCardsProps {
  stats: ProductStatistics;
  currency?: string;
}

type Tone = 'primary' | 'positive' | 'warning' | 'neutral';

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: ReactNode;
  value: ReactNode;
  tone: Tone;
}) {
  return (
    <Card size="sm" className="min-w-0">
      <Card.Content className="flex items-start gap-3">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-card-sm',
            tone === 'primary' && 'bg-primary/10 text-primary',
            tone === 'positive' && 'bg-positive/10 text-positive',
            tone === 'warning' && 'bg-warning/10 text-warning',
            tone === 'neutral' && 'bg-muted text-muted-foreground',
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="mt-1 truncate text-2xl font-semibold tabular-nums">
            {value}
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}

export function KpiCards({stats, currency = 'ETB'}: KpiCardsProps) {
  const {kpis} = stats;
  const items: Array<{
    icon: LucideIcon;
    label: ReactNode;
    value: ReactNode;
    tone: Tone;
  }> = [
    {
      icon: ShoppingBagIcon,
      label: <Trans message="Sales" />,
      value: <FormattedNumber value={kpis.sales_count} />,
      tone: 'primary',
    },
    {
      icon: CircleDollarSignIcon,
      label: <Trans message="Gross revenue" />,
      value: formatMoney(kpis.gross_cents, currency),
      tone: 'positive',
    },
    {
      icon: WalletCardsIcon,
      label: <Trans message="Earned" />,
      value: formatMoney(kpis.creator_earnings_cents, currency),
      tone: 'neutral',
    },
    {
      icon: EyeIcon,
      label: <Trans message="Views" />,
      value: <FormattedNumber value={kpis.views_count} />,
      tone: 'warning',
    },
    {
      icon: PercentIcon,
      label: <Trans message="Conversion" />,
      value:
        kpis.conversion_pct === null ? '—' : `${kpis.conversion_pct}%`,
      tone: 'neutral',
    },
  ];

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item, index) => (
        <KpiCard key={index} {...item} />
      ))}
    </div>
  );
}