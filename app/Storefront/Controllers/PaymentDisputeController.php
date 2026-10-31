<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentDispute;
use App\Storefront\OrderRecoveryService;
use App\Storefront\Services\CreatePaymentDispute;
use App\Storefront\Services\PaymentDisputeEvidence;
use App\Storefront\Services\UpdatePaymentDisputeStatus;
use Common\Core\BaseController;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentDisputeController extends BaseController
{
    public function store(Request $request, string $order)
    {
        $recovery = $this->recovery($request);
        $storefrontOrder = StorefrontOrder::query()->where('uuid', $order)->firstOrFail();

        $data = $request->validate([
            'reason' => ['required', 'string', Rule::in(StorefrontPaymentDispute::REASONS)],
            'message' => ['required', 'string', 'min:3', 'max:5000'],
        ]);

        $result = app(CreatePaymentDispute::class)->execute(
            $storefrontOrder,
            (string) $recovery->email,
            $data['reason'],
            $data['message'],
        );

        return response()->json([
            'dispute' => app(CreatePaymentDispute::class)->toArray($result['dispute']),
            'created' => $result['created'],
        ], $result['created'] ? 201 : 200);
    }

    public function index(Request $request)
    {
        $recovery = $this->recovery($request);
        $emailHash = hash('sha256', strtolower(trim((string) $recovery->email)));

        $disputes = StorefrontPaymentDispute::query()
            ->with(['conversation.status', 'order'])
            ->where('buyer_email_hash', $emailHash)
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (StorefrontPaymentDispute $dispute) => app(CreatePaymentDispute::class)->toArray($dispute))
            ->values();

        return $this->success(['disputes' => $disputes]);
    }

    public function show(Request $request, string $dispute)
    {
        $recovery = $this->recovery($request);
        $emailHash = hash('sha256', strtolower(trim((string) $recovery->email)));
        $model = StorefrontPaymentDispute::query()
            ->with(['conversation.status', 'order'])
            ->where('uuid', $dispute)
            ->where('buyer_email_hash', $emailHash)
            ->firstOrFail();

        return $this->success([
            'dispute' => app(CreatePaymentDispute::class)->toArray($model),
        ]);
    }

    public function creatorIndex(Request $request, string $order)
    {
        $storefrontOrder = StorefrontOrder::query()->where('uuid', $order)->firstOrFail();
        abort_unless((int) $storefrontOrder->creator_id === (int) $request->user()->id, 403);

        $disputes = StorefrontPaymentDispute::query()
            ->with(['conversation.status', 'order.latestDirectPaymentVerification'])
            ->where('storefront_order_id', $storefrontOrder->id)
            ->where('creator_id', $request->user()->id)
            ->latest('id')
            ->get()
            ->map(function (StorefrontPaymentDispute $dispute) use ($storefrontOrder) {
                return [
                    ...app(CreatePaymentDispute::class)->toArray($dispute),
                    'payment_evidence' => app(PaymentDisputeEvidence::class)->forOrder($storefrontOrder),
                ];
            })
            ->values();

        return $this->success(['disputes' => $disputes]);
    }

    public function creatorUpdate(Request $request, string $order, string $dispute)
    {
        $storefrontOrder = StorefrontOrder::query()->where('uuid', $order)->firstOrFail();
        abort_unless((int) $storefrontOrder->creator_id === (int) $request->user()->id, 403);

        $model = StorefrontPaymentDispute::query()
            ->where('uuid', $dispute)
            ->where('storefront_order_id', $storefrontOrder->id)
            ->where('creator_id', $request->user()->id)
            ->firstOrFail();

        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(StorefrontPaymentDispute::STATUSES)],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $result = app(UpdatePaymentDisputeStatus::class)->execute(
            $model,
            $data['status'],
            $request->user(),
            'creator',
            $data['note'] ?? null,
        );

        return $this->success([
            'dispute' => app(CreatePaymentDispute::class)->toArray($result['dispute']),
            'changed' => $result['changed'],
        ]);
    }

    public function adminIndex(Request $request)
    {
        abort_unless($request->user()?->hasPermission('admin.access'), 403);

        $creatorId = $request->integer('creator_id') ?: null;

        $disputes = StorefrontPaymentDispute::query()
            ->when($creatorId, fn ($query) => $query->where('creator_id', $creatorId))
            ->with(['conversation.status', 'order.latestDirectPaymentVerification'])
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(function (StorefrontPaymentDispute $dispute) {
                $order = $dispute->order;

                return [
                    ...app(CreatePaymentDispute::class)->toArray($dispute),
                    'order_status' => $order?->status,
                    'buyer_email' => $order?->buyer_email,
                    'payment_evidence' => $order
                        ? app(PaymentDisputeEvidence::class)->forOrder($order)
                        : null,
                ];
            })
            ->values();

        return $this->success(['disputes' => $disputes]);
    }

    public function adminShow(Request $request, string $dispute)
    {
        abort_unless($request->user()?->hasPermission('admin.access'), 403);

        $model = StorefrontPaymentDispute::query()
            ->with([
                'conversation.status',
                'conversation.items',
                'order.latestDirectPaymentVerification',
                'events',
            ])
            ->where('uuid', $dispute)
            ->firstOrFail();

        $order = $model->order;

        return $this->success([
            'dispute' => app(CreatePaymentDispute::class)->toArray($model),
            'order' => [
                'id' => $order?->uuid,
                'status' => $order?->status,
                'buyer_email' => $order?->buyer_email,
                'gross_amount_cents' => $order?->gross_amount_cents,
                'currency' => $order?->currency,
                'paid_at' => $order?->paid_at?->toIso8601String(),
            ],
            'payment_evidence' => $order
                ? app(PaymentDisputeEvidence::class)->forOrder($order)
                : null,
            'audit' => app(PaymentDisputeEvidence::class)->audit($model),
        ]);
    }

    public function adminUpdate(Request $request, string $dispute)
    {
        abort_unless($request->user()?->hasPermission('admin.access'), 403);

        $model = StorefrontPaymentDispute::query()
            ->where('uuid', $dispute)
            ->firstOrFail();

        $data = $request->validate([
            'status' => ['required', 'string', Rule::in(StorefrontPaymentDispute::STATUSES)],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $result = app(UpdatePaymentDisputeStatus::class)->execute(
            $model,
            $data['status'],
            $request->user(),
            'admin',
            $data['note'] ?? null,
        );

        return $this->success([
            'dispute' => app(CreatePaymentDispute::class)->toArray($result['dispute']),
            'changed' => $result['changed'],
        ]);
    }

    private function recovery(Request $request)
    {
        $recovery = app(OrderRecoveryService::class)->current($request);
        abort_unless($recovery, 403, __('Your portal session has expired. Request a new code to continue.'));

        return $recovery;
    }
}
