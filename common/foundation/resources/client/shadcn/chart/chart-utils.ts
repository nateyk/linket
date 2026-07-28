import {useMemo} from 'react';

type DateDatasetItem = {
  date: string;
  value: number;
  endDate?: string;
};

type RangedDatasetGranularity =
  | 'minute'
  | 'hour'
  | 'day'
  | 'week'
  | 'month'
  | 'year';

type GenerateTimeChartLabelProps = {
  locale?: string;
  granularity?: RangedDatasetGranularity;
  dataItem: DateDatasetItem;
};

type GenerateTimeChartTooltipProps = {
  locale?: string;
  granularity?: RangedDatasetGranularity;
  dataItem: DateDatasetItem;
};

function parseTimeChartDataItemDates(dataItem: DateDatasetItem): {
  date: Date;
  endDate: Date | null;
} | null {
  return {
    date: new Date(dataItem.date),
    endDate: dataItem.endDate ? new Date(dataItem.endDate) : null,
  };
}

export function generateTimeChartLabel({
  locale,
  granularity,
  dataItem,
}: GenerateTimeChartLabelProps): string {
  const parsed = parseTimeChartDataItemDates(dataItem);
  if (!parsed) {
    return '';
  }
  const {date} = parsed;

  if (granularity === 'minute') {
    return date.toLocaleDateString(locale, {
      second: '2-digit',
    });
  }
  if (granularity === 'hour') {
    return date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: 'numeric',
    });
  }
  if (granularity === 'day') {
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      weekday: 'short',
    });
  }
  if (granularity === 'week') {
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: '2-digit',
    });
  }
  if (granularity === 'month') {
    return date.toLocaleDateString(locale, {
      month: 'short',
      year: 'numeric',
    });
  }
  if (granularity === 'year') {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
    });
  }

  return '';
}

export function generateTimeChartTooltip({
  locale,
  granularity,
  dataItem,
}: GenerateTimeChartTooltipProps): string | undefined {
  const parsed = parseTimeChartDataItemDates(dataItem);
  if (!parsed) {
    return undefined;
  }
  const {date, endDate} = parsed;

  if (granularity === 'minute') {
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
      second: '2-digit',
    });
  }
  if (granularity === 'hour') {
    return date.toLocaleTimeString(locale, {
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
    });
  }
  if (granularity === 'day') {
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      weekday: 'short',
      month: 'short',
    });
  }
  if (granularity === 'week') {
    const weekTooltipFormatter = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    if (endDate) {
      return weekTooltipFormatter.formatRange(date, endDate);
    }
    return weekTooltipFormatter.format(date);
  }
  if (granularity === 'month') {
    return date.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });
  }
  if (granularity === 'year') {
    return date.toLocaleDateString(locale, {
      year: 'numeric',
    });
  }

  return undefined;
}

const chartColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];
export function useChartDataWithColors<T>(
  data: T[] | undefined | null,
  key: string = 'fill',
): T[] {
  return useMemo(() => {
    if (!data) {
      return [];
    }
    return data.map((item, i) => {
      const fill = chartColors[i % chartColors.length];
      return {
        ...item,
        [key]: fill,
      };
    });
  }, [data, key]);
}
