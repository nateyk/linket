import {message} from '@ui/i18n/message';
import {MessageDescriptor} from '@ui/i18n/message-descriptor';
import {FilterOperator} from './backend-filter';

export const FilterOperatorNames: {[op in FilterOperator]: MessageDescriptor} =
  {
    [FilterOperator.eq]: message('is'),
    [FilterOperator.ne]: message('is not'),
    [FilterOperator.gt]: message('is greater than'),
    [FilterOperator.gte]: message('is greater than or equal to'),
    [FilterOperator.lt]: message('is less than'),
    [FilterOperator.lte]: message('is less than or equal to'),
    [FilterOperator.has]: message('is not empty'),
    [FilterOperator.contains]: message('contains'),
    [FilterOperator.notContains]: message('does not contain'),
    [FilterOperator.startsWith]: message('starts with'),
    [FilterOperator.endsWith]: message('ends with'),
    [FilterOperator.hasAll]: message('Include all'),
    [FilterOperator.doesntHave]: message('Do not include'),
    [FilterOperator.between]: message('Is between'),
  };
