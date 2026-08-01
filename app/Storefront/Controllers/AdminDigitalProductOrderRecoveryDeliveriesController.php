<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProductOrderRecoveryDelivery;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

class AdminDigitalProductOrderRecoveryDeliveriesController extends Controller
{
    public function index(Request $request): array
    {
        Gate::authorize('admin.access');
        $filters = $request->validate([
            'status' => ['nullable', 'in:accepted,queued,sent,failed'],
            'event' => ['nullable', 'in:recovery_requested,recovery_email,receipt_resend_requested,receipt_email'],
            'search' => ['nullable', 'string', 'max:120'],
        ]);

        $deliveries = DigitalProductOrderRecoveryDelivery::query()
            ->with(['order.product'])
            ->when($filters['status'] ?? null, fn($query, string $status) => $query->where('status', $status))
            ->when($filters['event'] ?? null, fn($query, string $event) => $query->where('event', $event))
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('masked_email', 'like', "%{$search}%")
                        ->orWhereHas('order', fn($query) => $query->where('uuid', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->paginate(25);

        return [
            ...$deliveries->toArray(),
            'data' => $deliveries->getCollection()->map(fn(DigitalProductOrderRecoveryDelivery $delivery) => [
                'id' => $delivery->id,
                'masked_email' => $delivery->masked_email,
                'event' => $delivery->event,
                'status' => $delivery->status,
                'failure_code' => $delivery->failure_code,
                'created_at' => $delivery->created_at?->toIso8601String(),
                'order_reference' => $delivery->order?->uuid,
                'product_title' => $delivery->order?->product?->title,
            ])->values(),
        ];
    }
}
