import {opacityAnimation} from '@ui/animation/opacity-animation';
import {FormattedBytes} from '@ui/i18n/formatted-bytes';
import {FormattedDuration} from '@ui/i18n/formatted-duration';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {Trans} from '@ui/i18n/trans';
import {Skeleton} from '@ui/skeleton/skeleton';
import clsx from 'clsx';
import {AnimatePresence, m} from 'framer-motion';
import {MoveRightIcon, TrendingDownIcon, TrendingUpIcon} from 'lucide-react';
import {Fragment, ReactElement, ReactNode} from 'react';

type DataItem = {
  name: string;
  previousValue: number;
  currentValue: number;
  percentageChange: number;
  type?: 'number' | 'fileSize' | 'percentage' | 'durationInSeconds';
};

interface AdminHeaderReportProps {
  data?: DataItem[];
  isLoading?: boolean;
}
export function AdminReportCardRow({data, isLoading}: AdminHeaderReportProps) {
  if (!data) return <div className="col-span-12 row-span-3" />;
  return (
    <Fragment>
      {data?.map(data => (
        <ReportCard
          key={data.name}
          type={data.type}
          currentValue={data.currentValue}
          previousValue={data.previousValue}
          percentageChange={data.percentageChange}
          isLoading={isLoading}
        >
          <Trans message={data.name} />
        </ReportCard>
      ))}
    </Fragment>
  );
}

interface ReportCardProps {
  type?: DataItem['type'];
  currentValue: number | null;
  previousValue?: number | null;
  percentageChange?: number;
  isLoading?: boolean;
  children: ReactNode;
  colSpan?: string;
  rowSpan?: string;
}
export function ReportCard({
  children,
  type,
  currentValue,
  previousValue,
  percentageChange,
  isLoading = false,
  colSpan = 'col-span-3',
  rowSpan = 'row-span-3',
}: ReportCardProps) {
  return (
    <div
      className={clsx(
        'compact-scrollbar flex flex-col justify-between overflow-x-auto overflow-y-hidden rounded-card border px-5 py-3.5 whitespace-nowrap',
        colSpan,
        rowSpan,
      )}
    >
      <h2 className="text-sm font-semibold">{children}</h2>
      <div className="flex gap-2.5">
        <div className="text-4xl font-medium text-foreground">
          <AnimatePresence initial={false} mode="wait">
            {isLoading ? (
              <m.div key="skeleton" {...opacityAnimation}>
                <Skeleton className="min-w-10" />
              </m.div>
            ) : (
              <m.div key="value" {...opacityAnimation}>
                <FormattedValue type={type} value={currentValue} />
              </m.div>
            )}
          </AnimatePresence>
        </div>
        {currentValue != null &&
          (percentageChange != null || previousValue != null) && (
            <div className="flex items-center gap-2.5">
              <TrendingIndicator
                currentValue={currentValue}
                previousValue={previousValue}
                percentageChange={percentageChange}
              />
            </div>
          )}
      </div>
    </div>
  );
}

interface FormattedValueProps {
  type: ReportCardProps['type'];
  value: ReportCardProps['currentValue'];
}
function FormattedValue({type, value}: FormattedValueProps) {
  if (value == null) return '—';
  switch (type) {
    case 'fileSize':
      return <FormattedBytes bytes={value} />;
    case 'percentage':
      return (
        <FormattedNumber
          value={value}
          style="percent"
          maximumFractionDigits={1}
        />
      );
    case 'durationInSeconds':
      return <FormattedDuration seconds={value as number} verbose />;
    default:
      return <FormattedNumber value={value} />;
  }
}

interface TrendingIndicatorProps {
  currentValue: number;
  previousValue?: number | null;
  percentageChange?: number;
}
function TrendingIndicator(props: TrendingIndicatorProps) {
  const percentage = calculatePercentage(props);
  let icon: ReactElement;
  if (percentage > 0) {
    icon = <TrendingUpIcon className="text-positive" />;
  } else if (percentage === 0) {
    icon = <MoveRightIcon className="text-muted-foreground" />;
  } else {
    icon = <TrendingDownIcon className="text-destructive" />;
  }

  return (
    <Fragment>
      {icon}
      <div className="text-sm font-semibold text-muted-foreground">
        {percentage}%
      </div>
    </Fragment>
  );
}

function calculatePercentage({
  percentageChange,
  previousValue,
  currentValue,
}: TrendingIndicatorProps) {
  if (
    percentageChange != null ||
    previousValue == null ||
    currentValue == null
  ) {
    return percentageChange ?? 0;
  }

  if (previousValue === 0) {
    return 100;
  }

  return Math.round(((currentValue - previousValue) / previousValue) * 100);
}
