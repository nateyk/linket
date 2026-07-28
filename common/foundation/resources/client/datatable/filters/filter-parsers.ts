import {
  ALL_OPERATORS,
  BackendFilter,
  FilterOperator,
  ParsedFilterValue,
} from '@common/datatable/filters/backend-filter';
import {createMultiParser, createParser, MultiParser, SingleParser} from 'nuqs';

const parseBackendFilter = createParser<ParsedFilterValue>({
  parse(queryValue) {
    const [operator, value] = queryValue.split(':');
    if (operator && value) {
      if (ALL_OPERATORS.includes(operator as FilterOperator)) {
        return {
          operator: operator as FilterOperator,
          value: value,
        };
      }
    }

    return {
      operator: FilterOperator.eq,
      value: queryValue,
    };
  },
  serialize(value) {
    if (!value.operator) {
      value.operator = FilterOperator.eq;
    }

    if (value.operator === FilterOperator.eq) {
      return `${value.value}`;
    }

    return `${value.operator}:${value.value}`;
  },
});

type DateRangeParserValue = {
  start?: ParsedFilterValue<string>;
  end?: ParsedFilterValue<string>;
};

function splitDateValue(value: string): {operator: string; date: string} {
  const [operator, ...date] = value.split(':');
  return {operator, date: date.join(':')};
}

const dateFilterParser = createMultiParser<DateRangeParserValue>({
  parse(queryValue) {
    const [start, end] = queryValue
      .map(v => splitDateValue(v))
      .filter(v => v.date);
    if (!start || !end) {
      return null;
    }

    const parsed: DateRangeParserValue = {};
    if (start) {
      parsed.start = {
        value: start.date,
        operator: start.operator as FilterOperator,
      };
    }
    if (end) {
      parsed.end = {
        value: end.date,
        operator: end.operator as FilterOperator,
      };
    }

    return parsed;
  },
  serialize(value) {
    const start = value.start;
    const end = value.end;
    return [
      `${start?.operator ?? FilterOperator.gte}:${start?.value}`,
      `${end?.operator ?? FilterOperator.lte}:${end?.value}`,
    ];
  },
});

const arrayFilterParser = createMultiParser<ParsedFilterValue<string>[]>({
  parse(queryValue) {
    return queryValue.map(v => {
      const [operator, value] = v.split(':');
      return {
        value: value,
        operator: operator as FilterOperator,
      };
    });
  },
  serialize(value) {
    return value.map(v => `${v.operator}:${v.value}`);
  },
});

export function getParsersForFilters(filters: BackendFilter[]) {
  const parsers: Record<string, SingleParser<any> | MultiParser<any>> = {};
  filters.forEach(filter => {
    if (filter.valueType === 'array') {
      parsers[filter.key] = arrayFilterParser;
    } else if (filter.valueType === 'dateRange') {
      parsers[filter.key] = dateFilterParser;
    } else {
      parsers[filter.key] = parseBackendFilter;
    }
  });
  return parsers;
}
