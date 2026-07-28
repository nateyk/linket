<?php

namespace App\Webhooks\Controllers;

use App\Webhooks\Models\Webhook;
use App\Webhooks\Models\WebhookDeliveryAttempt;
use App\Webhooks\Resources\WebhookDeliveryAttemptResource;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

/**
 * @tags Webhooks
 */
class WebhookAttemptsController extends Controller
{
    /**
     * List webhook delivery attempts.
     *
     * @operationId listWebhookAttempts
     */
    public function index(string $id, Request $request)
    {
        $webhook = Webhook::findOrFail($id);

        Gate::authorize('show', $webhook);

        $data = $request->validate([
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
        ]);

        $attempts = WebhookDeliveryAttempt::query()
            ->where('webhook_id', $webhook->id)
            ->with('delivery')
            ->orderBy('id', 'desc')
            ->simplePaginate($data['per_page'] ?? 30);

        return WebhookDeliveryAttemptResource::collection($attempts);
    }

    /**
     * Retrieve a webhook delivery attempt.
     *
     * @operationId retrieveWebhookAttempt
     */
    public function show(string $webhookId, string $attemptId)
    {
        $attempt = WebhookDeliveryAttempt::with(
            'delivery',
            'webhook',
        )->findOrFail($attemptId);

        if ($attempt->webhook?->id !== $webhookId) {
            throw new ModelNotFoundException();
        }

        Gate::authorize('show', $attempt->webhook);

        return new WebhookDeliveryAttemptResource($attempt, 'show');
    }
}
