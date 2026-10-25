<?php

/**
 * BeDesk-native support API (Phase 1: HC + tickets + agents + email).
 */

use App\Attributes\Controllers\AttributesController;
use App\Attributes\Controllers\AttributesListController;
use App\CannedReplies\Controllers\CannedRepliesController;
use App\Reports\Controllers\HelpdeskReportsController;
use App\Contacts\Controllers\CustomerProfileController;
use App\Contacts\Controllers\CustomersController;
use App\Contacts\Controllers\MergeCustomersController;
use App\Conversations\Agent\Controllers\AgentConversationListController;
use App\Conversations\Agent\Controllers\AgentConversationsController;
use App\Conversations\Agent\Controllers\AgentMessagesController;
use App\Conversations\Agent\Controllers\ConversationsAssigneeController;
use App\Conversations\Agent\Controllers\ConversationsGroupController;
use App\Conversations\Agent\Controllers\ConversationsSearchController;
use App\Conversations\Agent\Controllers\ConversationsStatusController;
use App\Conversations\Agent\Controllers\ConversationStatusesController;
use App\Conversations\Agent\Controllers\ConversationTagsController;
use App\Conversations\Agent\Controllers\ConversationViewsController;
use App\Conversations\Agent\Controllers\HelpDeskAutocompleteController;
use App\Conversations\Agent\Controllers\MergeConversationsController;
use App\Conversations\Agent\Controllers\OriginalReplyEmailController;
use App\Conversations\Agent\Controllers\RecentCustomerConversationsController;
use App\Conversations\Agent\Controllers\ViewListController;
use App\Conversations\Customer\Controllers\CustomerMessagesController;
use App\Conversations\Customer\Controllers\CustomerNewTicketPageDataController;
use App\Conversations\Customer\Controllers\CustomerTicketsController;
use App\Conversations\Email\Webhooks\EmailApiWebhookController;
use App\HelpCenter\Controllers\HcActionsController;
use App\HelpCenter\Controllers\HcArticleAttachmentsController;
use App\HelpCenter\Controllers\HcArticleAuthorController;
use App\HelpCenter\Controllers\HcArticleController;
use App\HelpCenter\Controllers\HcArticleFeedbackController;
use App\HelpCenter\Controllers\HcArticleSearchController;
use App\HelpCenter\Controllers\HcCategoryController;
use App\HelpCenter\Controllers\HcLandingPageController;
use App\HelpCenter\Controllers\HelpCenterManagerController;
use App\HelpCenter\Controllers\HelpCenterTaggablesController;
use App\Team\Controllers\AgentInvitesController;
use App\Team\Controllers\AgentsController;
use App\Team\Controllers\CompactAgentsController;
use App\Team\Controllers\GroupsController;
use App\Triggers\Controllers\TriggerController;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Support\Facades\Route;

Route::group(['middleware' => ['optionalAuth:sanctum', 'verified', 'verifyApiAccess']], function () {
    // AGENT CONVERSATIONS
    Route::get('helpdesk/agent/conversations', [AgentConversationsController::class, 'index']);
    Route::post('helpdesk/agent/conversations', [AgentConversationsController::class, 'store']);
    Route::put('helpdesk/agent/conversations/{id}', [AgentConversationsController::class, 'update']);
    Route::post('helpdesk/agent/conversations/merge', MergeConversationsController::class);
    Route::get('helpdesk/agent/conversations/{id}', [AgentConversationsController::class, 'show']);
    Route::delete('helpdesk/agent/conversations/{ids}', [AgentConversationsController::class, 'destroy']);
    Route::get('helpdesk/agent/conversations/{conversationId}/messages', [AgentMessagesController::class, 'index']);
    Route::post('helpdesk/agent/conversations/{conversationId}/messages', [AgentMessagesController::class, 'store']);
    Route::post('helpdesk/agent/conversations/status/change', [ConversationsStatusController::class, 'update']);
    Route::post('helpdesk/agent/conversations/assignee/change', [ConversationsAssigneeController::class, 'update']);
    Route::post('helpdesk/agent/conversations/group/change', [ConversationsGroupController::class, 'update']);
    Route::get('helpdesk/agent/conversations/recent/{userId}', RecentCustomerConversationsController::class);
    Route::get('helpdesk/agent/{agentId}/conversation-list', AgentConversationListController::class);

    // CUSTOMER CONVERSATIONS
    // Creating a ticket stays open to guests (optionalAuth group above), but
    // reading or replying to tickets always requires an account.
    Route::post('helpdesk/customer/tickets', [CustomerTicketsController::class, 'store']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('helpdesk/customer/tickets', [CustomerTicketsController::class, 'index']);
        Route::get('helpdesk/customer/tickets/{id}', [CustomerTicketsController::class, 'show']);
        Route::get('helpdesk/customer/conversations/{conversationId}/messages', [CustomerMessagesController::class, 'index']);
        Route::post('helpdesk/customer/conversations/{conversationId}/messages', [CustomerMessagesController::class, 'store']);
        Route::post('helpdesk/customer/conversations/{id}/mark-as-solved', [CustomerTicketsController::class, 'markConversationAsSolved']);
    });
    Route::get('helpdesk/customer-new-ticket-page-config', CustomerNewTicketPageDataController::class);

    // TAGS / REPLIES / STATUSES
    Route::post('helpdesk/conversations/tags/add', [ConversationTagsController::class, 'add']);
    Route::post('helpdesk/conversations/tags/remove', [ConversationTagsController::class, 'remove']);
    Route::get('helpdesk/conversations/{conversationId}/tags', [ConversationTagsController::class, 'index']);
    Route::get('helpdesk/agent/messages/{messageId}/email', [OriginalReplyEmailController::class, 'show']);
    Route::get('helpdesk/agent/messages/{messageId}/email/download', [OriginalReplyEmailController::class, 'download']);
    Route::put('helpdesk/agent/messages/{messageId}', [AgentMessagesController::class, 'update']);
    Route::delete('helpdesk/agent/messages/{messageId}', [AgentMessagesController::class, 'destroy']);
    Route::get('helpdesk/statuses/list', [ConversationStatusesController::class, 'listForConversation']);
    Route::get('helpdesk/statuses', [ConversationStatusesController::class, 'index']);
    Route::post('helpdesk/statuses', [ConversationStatusesController::class, 'store']);
    Route::put('helpdesk/statuses/{id}', [ConversationStatusesController::class, 'update']);
    Route::delete('helpdesk/statuses/{ids}', [ConversationStatusesController::class, 'destroy']);

    // CUSTOMERS
    Route::get('helpdesk/customers', [CustomersController::class, 'index']);
    Route::get('helpdesk/customers/{id}', [CustomerProfileController::class, 'show']);
    Route::put('helpdesk/customers/{id}', [CustomerProfileController::class, 'update']);
    Route::get('helpdesk/customers/{id}/conversations', [CustomerProfileController::class, 'conversations']);
    Route::post('helpdesk/customers/merge', MergeCustomersController::class);
    Route::delete('helpdesk/customers/{id}', [CustomersController::class, 'destroy']);

    // SEARCH / VIEWS / GROUPS / AGENTS
    Route::get('search/articles', HcArticleSearchController::class);
    Route::get('search/conversations', ConversationsSearchController::class);
    Route::get('helpdesk/inbox/views', ViewListController::class);
    Route::apiResource('helpdesk/views', ConversationViewsController::class);
    Route::post('helpdesk/views/reorder', [ConversationViewsController::class, 'reorder']);
    Route::get('helpdesk/groups', [GroupsController::class, 'index']);
    Route::get('helpdesk/groups/{groupId}', [GroupsController::class, 'show']);
    Route::post('helpdesk/groups', [GroupsController::class, 'store']);
    Route::put('helpdesk/groups/{groupId}', [GroupsController::class, 'update']);
    Route::delete('helpdesk/groups/{groupId}', [GroupsController::class, 'destroy']);
    Route::get('helpdesk/agents/invites', [AgentInvitesController::class, 'index']);
    Route::post('helpdesk/agents/invite/{inviteId}/resend', [AgentInvitesController::class, 'resend']);
    Route::post('helpdesk/agents/invite', [AgentInvitesController::class, 'store']);
    Route::delete('helpdesk/agents/invite/{inviteId}', [AgentInvitesController::class, 'destroy']);
    Route::get('helpdesk/agents', [AgentsController::class, 'index']);
    Route::get('helpdesk/agents/{agentId}', [AgentsController::class, 'show']);
    Route::put('helpdesk/agents/{agentId}', [AgentsController::class, 'update']);
    Route::get('helpdesk/compact-agents', CompactAgentsController::class);

    // HELP CENTER
    Route::get('hc', HcLandingPageController::class);
    Route::get('hc/manager/categories', [HelpCenterManagerController::class, 'categories']);
    Route::get('hc/manager/categories/{categoryId}/sections', [HelpCenterManagerController::class, 'categories']);
    Route::get('hc/manager/sections/{sectionId}/articles', [HelpCenterManagerController::class, 'articles']);
    Route::post('hc/manager/sections/{sectionId}/articles/reorder', [HelpCenterManagerController::class, 'reorderArticles']);
    Route::post('hc/manager/categories/reorder', [HelpCenterManagerController::class, 'reorderCategories']);
    Route::post('hc/taggables/sync-tags', [HelpCenterTaggablesController::class, 'syncTags']);
    Route::get('hc/sidenav/{categoryId}', [HcCategoryController::class, 'sidenavContent']);
    Route::get('hc/categories/{categoryId}', [HcCategoryController::class, 'show']);
    Route::post('hc/categories', [HcCategoryController::class, 'store']);
    Route::put('hc/categories/{id}', [HcCategoryController::class, 'update']);
    Route::delete('hc/categories/{id}', [HcCategoryController::class, 'destroy']);
    Route::get('hc/articles/{articleId}/download/{entryHash}', [HcArticleAttachmentsController::class, 'download']);
    Route::get('hc/articles/{categoryId}/{sectionId}/{articleId}', [HcArticleController::class, 'show']);
    Route::get('hc/articles/{articleId}', [HcArticleController::class, 'show']);
    Route::get('hc/articles', [HcArticleController::class, 'index']);
    Route::post('hc/articles', [HcArticleController::class, 'store']);
    Route::put('hc/articles/{article}', [HcArticleController::class, 'update']);
    Route::post('hc/articles/{article}/feedback', [HcArticleFeedbackController::class, 'store']);
    Route::delete('hc/articles/{id}', [HcArticleController::class, 'destroy']);
    Route::post('hc/articles/batch-action', [HcArticleController::class, 'performBatchAction']);
    Route::post('hc/actions/import', [HcActionsController::class, 'import']);
    Route::get('hc/actions/export', [HcActionsController::class, 'export']);

    Route::get('helpdesk/normalized-models/article-authors', [HcArticleAuthorController::class, 'index']);
    Route::get('helpdesk/normalized-models/article-authors/{userId}', [HcArticleAuthorController::class, 'show']);
    Route::get('helpdesk/normalized-models/tags', [HelpDeskAutocompleteController::class, 'tags']);
    Route::get('helpdesk/normalized-models/hc-categories', [HelpDeskAutocompleteController::class, 'hcCategories']);
    Route::get('helpdesk/normalized-models/agents', [HelpDeskAutocompleteController::class, 'agents']);
    Route::get('helpdesk/normalized-models/groups', [HelpDeskAutocompleteController::class, 'groups']);
    Route::get('helpdesk/normalized-models/roles', [HelpDeskAutocompleteController::class, 'roles']);
    Route::get('helpdesk/normalized-models/envato-items', [HelpDeskAutocompleteController::class, 'envatoItems']);
    Route::get('helpdesk/normalized-models/customer', [HelpDeskAutocompleteController::class, 'customers']);
    Route::get('helpdesk/normalized-models/customer/{id}', [HelpDeskAutocompleteController::class, 'customer']);

    // CANNED REPLIES (Phase 2)
    Route::get('helpdesk/canned-replies', [CannedRepliesController::class, 'index']);
    Route::post('helpdesk/canned-replies', [CannedRepliesController::class, 'store']);
    Route::get('helpdesk/canned-replies/{replyId}', [CannedRepliesController::class, 'show']);
    Route::put('helpdesk/canned-replies/{id}', [CannedRepliesController::class, 'update']);
    Route::delete('helpdesk/canned-replies/{ids}', [CannedRepliesController::class, 'destroy']);

    // ATTRIBUTES
    Route::get('helpdesk/attributes/list', AttributesListController::class);
    Route::apiResource('helpdesk/attributes', AttributesController::class);

    // REPORTS (Phase 2)
    Route::get('reports/conversations/{type}', [HelpdeskReportsController::class, 'conversations']);
    Route::get('reports/agents', [HelpdeskReportsController::class, 'agents']);
    Route::get('reports/tags', [HelpdeskReportsController::class, 'tags']);
    Route::get('reports/search/{type}', [HelpdeskReportsController::class, 'search']);
    Route::get('reports/articles', [HelpdeskReportsController::class, 'articles']);

    // TRIGGERS (Phase 2)
    Route::get('triggers', [TriggerController::class, 'index']);
    Route::get('triggers/config', [TriggerController::class, 'config']);
    Route::get('triggers/{trigger}', [TriggerController::class, 'show']);
    Route::post('triggers', [TriggerController::class, 'store']);
    Route::put('triggers/{trigger}', [TriggerController::class, 'update']);
    Route::delete('triggers/{ids}', [TriggerController::class, 'destroy']);

    // EMAIL WEBHOOKS
    Route::post('tickets/mail/incoming', [EmailApiWebhookController::class, 'handleIncoming'])
        ->withoutMiddleware(VerifyCsrfToken::class);
    Route::post('tickets/mail/failed', [EmailApiWebhookController::class, 'handleFailed'])
        ->withoutMiddleware(VerifyCsrfToken::class);
});
