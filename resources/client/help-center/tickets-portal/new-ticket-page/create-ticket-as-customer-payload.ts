import {ConversationAttachment} from '@app/dashboard/types/conversation-attachment';

export interface CreateTicketAsCustomerPayload {
  subject: string;
  email?: string;
  support_owner_id?: number;
  message: {
    body: string;
    attachments: ConversationAttachment[];
  };
  attributes: Record<string, unknown>;
}
