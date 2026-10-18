import {describe, expect, test} from 'vitest';
import {
  buildInquiryQuery,
  inquiryStatusMessage,
  inquiryStatusVariant,
} from './service-inquiry-filters';

describe('inquiry filters', () => {
  test('omits empty filters and keeps the page', () => {
    expect(buildInquiryQuery({})).toBe('/api/v1/services/inquiries?per_page=30');
    expect(buildInquiryQuery({serviceId: '3', status: 'new', page: 2})).toBe(
      '/api/v1/services/inquiries?per_page=30&page=2&service_id=3&status=new',
    );
  });

  test('maps every status to a translatable message', () => {
    expect(inquiryStatusMessage('new').message).toBe('New');
    expect(inquiryStatusMessage('contacted').message).toBe('Contacted');
    expect(inquiryStatusMessage('won').message).toBe('Won');
    expect(inquiryStatusMessage('lost').message).toBe('Lost');
    expect(inquiryStatusMessage('archived').message).toBe('Archived');
    expect(inquiryStatusMessage('unknown').message).toBe('New');
  });

  test('maps statuses to badge variants', () => {
    expect(inquiryStatusVariant('won')).toBe('positive');
    expect(inquiryStatusVariant('lost')).toBe('destructive');
    expect(inquiryStatusVariant('contacted')).toBe('secondary');
    expect(inquiryStatusVariant('new')).toBe('default');
  });
});
