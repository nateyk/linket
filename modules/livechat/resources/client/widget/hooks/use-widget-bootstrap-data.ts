import {ConversationContentItem} from '@app/dashboard/conversations/conversation-page/messages/conversation-message';
import {FullWidgetConversationResponse} from '@livechat/widget/conversation-screen//requests/full-widget-conversation-response';
import {WidgetCustomer} from '@livechat/widget/user/widget-customer';
import {
  getBootstrapData,
  useBootstrapDataStore,
} from '@ui/bootstrap-data/bootstrap-data-store';

export interface WidgetBootstrapData {
  activeConversationData?: FullWidgetConversationResponse;
  user: WidgetCustomer;
  scopedHcCategoryId?: number;
  knowledgeScopeTag?: string;
  aiAgent?: {
    id?: number | string;
    name?: string;
    image?: string;
  };
  newChatGreeting?: {
    parts: ConversationContentItem[];
    flow_id?: number;
  };
}

export function useWidgetBootstrapData() {
  const {data} = useBootstrapDataStore();
  return data as unknown as WidgetBootstrapData;
}

export function getWidgetBootstrapData() {
  return getBootstrapData() as unknown as WidgetBootstrapData;
}
