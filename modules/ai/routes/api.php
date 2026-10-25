<?php

use Ai\AiAgent\Flows\Controllers\AiAgentFlowsController;
use Ai\AiAgent\Flows\Controllers\FlowAttachmentsController;
use Ai\AiAgent\Reports\AiAgentReportsController;
use Ai\AiAgent\Tools\ToolsController;
use Ai\Controllers\AiAgentArticlesController;
use Ai\Controllers\AiAgentDocumentsController;
use Ai\Controllers\AiAgentKnowledgeController;
use Ai\Controllers\AiAgentSettingsController;
use Ai\Controllers\AiAgentSnippetsController;
use Ai\Controllers\AiAgentWebsiteController;
use Ai\Controllers\ConversationSummaryController;
use Ai\Controllers\EnhanceTextWithAIController;
use Ai\Controllers\FlowActionsController;
use Ai\Controllers\AiAgentPreviewController;
use Illuminate\Support\Facades\Route;

Route::group(['prefix' => 'v1'], function () {
    Route::group(['middleware' => ['optionalAuth:sanctum', 'verified', 'verifyApiAccess']], function () {
        // AI
        Route::post('ai/modify-text', EnhanceTextWithAIController::class);

        // AI summary
        Route::get('helpdesk/conversations/{conversationId}/summary', [ConversationSummaryController::class, 'show']);
        Route::post('helpdesk/conversations/{conversationId}/summary/generate', [ConversationSummaryController::class, 'generate']);
        Route::delete('helpdesk/conversations/{conversationId}/summary', [ConversationSummaryController::class, 'destroy']);

        // AI agent websites
        Route::post('lc/ai-agent/ingest/website', [AiAgentWebsiteController::class, 'store']);
        Route::get('lc/ai-agent/websites', [AiAgentWebsiteController::class, 'index']);
        Route::get('lc/ai-agent/websites/{websiteId}/webpages', [AiAgentWebsiteController::class, 'indexPages']);
        Route::get('lc/ai-agent/websites/{websiteId}/webpages/{webpageId}', [AiAgentWebsiteController::class, 'showPage']);
        Route::delete('lc/ai-agent/websites/{websiteId}', [AiAgentWebsiteController::class, 'destroyWebsite']);
        Route::delete('lc/ai-agent/websites/{websiteId}/webpages/{webpageIds}', [AiAgentWebsiteController::class, 'destroyPage']);
        Route::post('lc/ai-agent/websites/{websiteId}/sync', [AiAgentWebsiteController::class, 'syncWebsite']);
        Route::post('lc/ai-agent/webpages/{webpageId}/sync', [AiAgentWebsiteController::class, 'syncPageContent']);

        // AI agent documents
        Route::get('lc/ai-agent/documents', [AiAgentDocumentsController::class, 'index']);
        Route::get('lc/ai-agent/documents/{documentId}', [AiAgentDocumentsController::class, 'show']);
        Route::delete('lc/ai-agent/documents/{documentIds}', [AiAgentDocumentsController::class, 'destroy']);

        // AI agent snippets
        Route::get('lc/ai-agent/snippets', [AiAgentSnippetsController::class, 'index']);
        Route::get('lc/ai-agent/snippets/{snippetId}', [AiAgentSnippetsController::class, 'show']);
        Route::post('lc/ai-agent/snippets', [AiAgentSnippetsController::class, 'store']);
        Route::put('lc/ai-agent/snippets/{snippetId}', [AiAgentSnippetsController::class, 'update']);
        Route::delete('lc/ai-agent/snippets/{snippetIds}', [AiAgentSnippetsController::class, 'destroy']);
        Route::post('lc/ai-agent/snippets/ingest', [AiAgentSnippetsController::class, 'ingest']);
        Route::post('lc/ai-agent/snippets/uningest', [AiAgentSnippetsController::class, 'uningest']);

        // AI agent knowledge
        Route::get('lc/ai-agent/knowledge', [AiAgentKnowledgeController::class, 'index']);
        Route::post('lc/ai-agent/articles/ingest', [AiAgentArticlesController::class, 'ingestArticles']);
        Route::post('lc/ai-agent/articles/uningest', [AiAgentArticlesController::class, 'uningestArticles']);

        // AI agent flows
        Route::get('lc/ai-agent/flows', [AiAgentFlowsController::class, 'index']);
        Route::get('lc/ai-agent/flows/list', [AiAgentFlowsController::class, 'list']);
        Route::get('lc/ai-agent/flows/{flowId}', [AiAgentFlowsController::class, 'show']);
        Route::get('lc/ai-agent/flows/{flowId}/attachments', [FlowAttachmentsController::class, 'index']);
        Route::post('lc/ai-agent/flows', [AiAgentFlowsController::class, 'store']);
        Route::put('lc/ai-agent/flows/{flowId}', [AiAgentFlowsController::class, 'update']);
        Route::delete('lc/ai-agent/flows/{ids}', [AiAgentFlowsController::class, 'destroy']);
        Route::delete('lc/ai-agent/flows/{flowId}/attachments/{attachmentId}', [FlowAttachmentsController::class, 'destroy']);

        // AI agent tools
        Route::get('lc/ai-agent/tools/list', [ToolsController::class, 'list']);
        Route::post('lc/ai-agent/tools/test-request', [ToolsController::class, 'testRequest']);
        Route::get('lc/ai-agent/tools', [ToolsController::class, 'index']);
        Route::get('lc/ai-agent/tools/{toolId}', [ToolsController::class, 'show']);
        Route::post('lc/ai-agent/tools', [ToolsController::class, 'store']);
        Route::put('lc/ai-agent/tools/{toolId}', [ToolsController::class, 'update']);
        Route::delete('lc/ai-agent/tools/{toolId}', [ToolsController::class, 'destroy']);

        // AI agent reports
        Route::get('reports/ai-agent', [AiAgentReportsController::class, 'overview']);

        // AI agent settings
        Route::get('lc/ai-agent/settings', [AiAgentSettingsController::class, 'index']);
        Route::put('lc/ai-agent/settings', [AiAgentSettingsController::class, 'update']);

        // AI agent actions
        Route::post('conversations/{conversationId}/flows/go-to-node', [FlowActionsController::class, 'goToNode']);
        Route::post('conversations/{conversationId}/flows/set-attributes', [FlowActionsController::class, 'setAttributes']);

        // AI agent preview
        Route::delete('lc/ai-agent-preview/conversations/{conversationId}', [AiAgentPreviewController::class, 'deleteConversation']);
    });
});
