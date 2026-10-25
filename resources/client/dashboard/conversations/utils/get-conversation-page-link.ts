export function getConversationPageLink(
  conversation: {id: number},
  {
    viewId,
    inboxBasePath = '/agent',
  }: {viewId?: number | string | null; inboxBasePath?: string} = {},
): string {
  if (!viewId) viewId = 'all';
  return `${inboxBasePath}/conversations/${conversation.id}?viewId=${viewId}`;
}
