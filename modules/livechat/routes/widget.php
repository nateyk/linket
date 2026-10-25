<?php

use App\Conversations\Customer\Controllers\CustomerTicketsController;
use Illuminate\Broadcasting\BroadcastController;
use Illuminate\Support\Facades\Route;
use Livechat\Controllers\ChatTranscriptController;
use Livechat\Widget\Controllers\WidgetActiveChatController;
use Livechat\Widget\Controllers\WidgetCampaignsController;
use Livechat\Widget\Controllers\WidgetChatMessagesController;
use Livechat\Widget\Controllers\WidgetConversationsController;
use Livechat\Widget\Controllers\WidgetHelpCenterController;
use Livechat\Widget\Controllers\WidgetHomeController;
use Livechat\Widget\Controllers\WidgetCustomerController;
use Livechat\Widget\Controllers\WidgetCustomerEmailController;
use Livechat\Widget\Controllers\WidgetCustomerExternalData as WidgetCustomerExternalData;
use Livechat\Widget\Controllers\WidgetVisitsController;
use Livechat\Widget\Middleware\AuthenticateWidget;

//make sure widget and all widget/* routes are handled by widget router correctly
Route::group(['middleware' => ['web', AuthenticateWidget::class]], function() {
    Route::as('chatWidgetHome')->get('lc/widget', WidgetHomeController::class);
    Route::as('aiAgentPreviewMode')->get('lc/widget/ai-agent-preview-mode', WidgetHomeController::class);
    Route::get('lc/widget/{any}', WidgetHomeController::class)->where('any', '.*');

    Route::match(['GET', 'POST'], 'lc/widget/broadcasting/auth', [BroadcastController::class, 'authenticate']);
});

Route::group(['prefix' => 'api/v1/lc/widget', 'middleware' => ['api', AuthenticateWidget::class, 'verifyApiAccess']], function () {

    Route::match(['GET', 'POST'], 'broadcasting/auth', [BroadcastController::class, 'authenticate']);

    // conversations
    Route::get('chats/active', WidgetActiveChatController::class);
    Route::get('conversations', [WidgetConversationsController::class, 'index']);
    Route::get('conversations/{chatId}', [WidgetConversationsController::class, 'show']);
    Route::post('tickets', [CustomerTicketsController::class, 'store']);
    Route::post('chats', [WidgetConversationsController::class, 'store']);
    Route::post('chats/{chatId}/submit-form-data', [WidgetConversationsController::class, 'submitFormData']);
    Route::get('chats/{chatId}/download-transcript', ChatTranscriptController::class);

    // messages
    Route::get('chats/{chatId}/messages', [WidgetChatMessagesController::class, 'index']);
    Route::post('chats/{chatId}/messages', [WidgetChatMessagesController::class, 'store']);

    // users
    Route::get('customer', [WidgetCustomerController::class, 'show']);
    Route::put('customers/email', [WidgetCustomerEmailController::class, 'update']);
    Route::post('customers/sync-external-data', WidgetCustomerExternalData::class);

    // visits
    Route::post('visits', [WidgetVisitsController::class, 'store']);
    Route::post('visits/{visitId}/change-status', [WidgetVisitsController::class, 'changeStatus']);

    // campaigns
    Route::get('campaigns', [WidgetCampaignsController::class, 'index']);
    Route::post('campaigns/{campaignId}/imp', [WidgetCampaignsController::class, 'logImpression']);

    // help center
    Route::get('help-center-data', [WidgetHelpCenterController::class, 'helpCenterData']);
    Route::get('home-article-list', [WidgetHelpCenterController::class, 'homeArticleList']);
});
