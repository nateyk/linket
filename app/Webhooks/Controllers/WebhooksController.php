<?php

namespace App\Webhooks\Controllers;

use App\Webhooks\Actions\SendTestWebhookEvent;
use App\Webhooks\Models\Webhook;
use App\Webhooks\Requests\CrupdateWebhookRequest;
use App\Webhooks\Resources\WebhookResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

/**
 * @tags Webhooks
 */
class WebhooksController extends Controller
{
    /**
     * List all webhooks.
     *
     * @operationId listWebhooks
     */
    public function index()
    {
        Gate::allowIf(fn() => Auth::check());

        $webhooks = Webhook::query()
            ->withTrashed()
            ->with('user')
            ->withCount('deliveryAttempts')
            ->where('user_id', Auth::id())
            ->limit(100)
            ->get();

        return WebhookResource::collection($webhooks);
    }

    /**
     * Retrieve a webhook.
     *
     * @operationId retrieveWebhook
     */
    public function show(string $id)
    {
        $webhook = Webhook::withTrashed()->findOrFail($id);

        Gate::authorize('show', $webhook);

        $webhook->loadCount('deliveries');

        return new WebhookResource($webhook->loadMissing('user'));
    }

    /**
     * Create a webhook.
     *
     * @operationId createWebhook
     */
    public function store(CrupdateWebhookRequest $request)
    {
        Gate::authorize('store', Webhook::class);

        $webhook = Webhook::create([
            'name' => $request->input('name'),
            'url' => $request->input('url'),
            'selected_events' => collect($request->input('selected_events'))
                ->unique()
                ->values()
                ->toArray(),
            'user_id' => Auth::id(),
            'signing_secret' =>
                $request->input('signing_secret') ?? 'whsec_' . Str::random(32),
        ]);

        return new WebhookResource($webhook->loadMissing('user'));
    }

    /**
     * Update a webhook.
     *
     * @operationId updateWebhook
     */
    public function update(string $id, CrupdateWebhookRequest $request)
    {
        $webhook = Webhook::findOrFail($id);

        Gate::authorize('update', $webhook);

        $attributes = Arr::only($request->all(), [
            'name',
            'url',
            'selected_events',
        ]);

        if (isset($attributes['selected_events'])) {
            $attributes['selected_events'] = collect(
                $attributes['selected_events'],
            )
                ->unique()
                ->values()
                ->toArray();
        }

        $webhook->update($attributes);

        return new WebhookResource($webhook->fresh()->loadMissing('user'));
    }

    /**
     * Delete a webhook.
     *
     * @operationId deleteWebhook
     */
    public function destroy(string $id)
    {
        $webhook = Webhook::withTrashed()->findOrFail($id);

        Gate::authorize('destroy', [Webhook::class, [$webhook->id]]);
        $webhook->forceDelete();

        return response()->noContent();
    }

    /**
     * Enable a disabled webhook.
     *
     * @operationId enableWebhook
     */
    public function enable(string $id)
    {
        $webhook = Webhook::withTrashed()->findOrFail($id);

        Gate::authorize('update', $webhook);

        $webhook->restore();

        return response()->noContent();
    }

    /**
     * Disable a webhook.
     *
     * @operationId disableWebhook
     */
    public function disable(string $id)
    {
        $webhook = Webhook::withTrashed()->findOrFail($id);

        Gate::authorize('update', $webhook);

        $webhook->delete();

        return response()->noContent();
    }

    /**
     * Send a test webhook event.
     *
     * @operationId sendTestWebhookEvent
     */
    public function sendTestEvent(string $id, Request $request)
    {
        $webhook = Webhook::findOrFail($id);

        $data = $request->validate([
            'event_type' => ['required', 'string'],
        ]);

        Gate::authorize('update', $webhook);

        (new SendTestWebhookEvent())->execute($webhook, $data['event_type']);

        return response()->noContent();
    }
}
