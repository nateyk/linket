import {message} from '@ui/i18n/message';

export type InquiryStatus =
  | 'new'
  | 'contacted'
  | 'won'
  | 'lost'
  | 'archived';

export function buildInquiryQuery(filters: {
  serviceId?: string | number;
  status?: string;
  page?: number;
}): string {
  const params = new URLSearchParams({per_page: '30'});

  if (filters.page) {
    params.set('page', String(filters.page));
  }
  if (filters.serviceId) {
    params.set('service_id', String(filters.serviceId));
  }
  if (filters.status) {
    params.set('status', filters.status);
  }

  return `/api/v1/services/inquiries?${params.toString()}`;
}

export function inquiryStatusMessage(status: string) {
  switch (status) {
    case 'contacted':
      return message('Contacted');
    case 'won':
      return message('Won');
    case 'lost':
      return message('Lost');
    case 'archived':
      return message('Archived');
    default:
      return message('New');
  }
}

export function inquiryStatusVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'positive' {
  switch (status) {
    case 'won':
      return 'positive';
    case 'lost':
      return 'destructive';
    case 'contacted':
    case 'archived':
      return 'secondary';
    default:
      return 'default';
  }
}
