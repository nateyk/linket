<?php

namespace App\Storefront\Services;

use App\Conversations\Customer\Actions\CreateTicketAsCustomer;
use App\Conversations\Models\Conversation;
use App\Models\User;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentDispute;
use App\Storefront\Models\StorefrontPaymentDisputeEvent;
use App\Storefront\Notifications\PaymentDisputeStatusChangedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class CreatePaymentDispute
{
    public const REASON_LABELS = [
        'wrong_reference' => 'Wrong payment reference',
        'duplicate_payment' => 'Duplicate payment',
        'missing_file' => 'Missing download file',
    ];

    /**
     * @return array{dispute: StorefrontPaymentDispute, created: bool}
     */
    public function execute(StorefrontOrder $order, string $buyerEmail, string $reason, string $message): array
    {
        $reason = strtolower(trim($reason));
        if (! in_array($reason, StorefrontPaymentDispute::REASONS, true)) {
            throw ValidationException::withMessages([
                'reason' => __('Choose a valid payment dispute reason.'),
            ]);
        }

        $normalizedEmail = strtolower(trim($buyerEmail));
        if ($normalizedEmail === '' || strtolower((string) $order->buyer_email) !== $normalizedEmail) {
            abort(403, __('You can only report problems for your own purchases.'));
        }

        if (! in_array($order->status, ['paid', 'fulfilled', 'failed_verification', 'manual_review', 'verifying', 'pending_payment'], true)) {
            throw ValidationException::withMessages([
                'order' => __('This order cannot be disputed.'),
            ]);
        }

        $body = trim($message);
        if (strlen($body) < 3) {
            throw ValidationException::withMessages([
                'message' => __('Describe what went wrong.'),
            ]);
        }

        return DB::transaction(function () use ($order, $normalizedEmail, $reason, $body): array {
            $existing = StorefrontPaymentDispute::query()
                ->where('storefront_order_id', $order->id)
                ->where('reason', $reason)
                ->whereIn('lifecycle_status', StorefrontPaymentDispute::ACTIVE_STATUSES)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                return ['dispute' => $existing->fresh(['conversation.status', 'order', 'events']), 'created' => false];
            }

            $user = User::query()->whereRaw('LOWER(email) = ?', [$normalizedEmail])->first()
                ?? User::findBySecondaryEmail($normalizedEmail);
            if (! $user) {
                // Avoid CreateUser's UserCreated biolink side-effects (needs Auth::user()).
                $user = User::query()->forceCreate([
                    'name' => Str::before($normalizedEmail, '@'),
                    'username' => 'buyer-'.Str::lower(Str::random(10)),
                    'email' => $normalizedEmail,
                    'password' => Hash::make(Str::random(32)),
                    'email_verified_at' => now(),
                ]);
            }

            $label = self::REASON_LABELS[$reason];
            $conversation = (new CreateTicketAsCustomer())->execute([
                'subject' => "{$label} — {$order->uuid}",
                'channel' => 'website',
                'support_owner_id' => $order->creator_id,
                'attributes' => [
                    'category' => 'billing',
                    'order_uuid' => $order->uuid,
                    'dispute_reason' => $reason,
                ],
                'message' => [
                    'body' => '<p>'.e($body).'</p>',
                ],
            ], $user);

            $dispute = StorefrontPaymentDispute::query()->create([
                'uuid' => (string) Str::uuid(),
                'storefront_order_id' => $order->id,
                'conversation_id' => $conversation->id,
                'creator_id' => $order->creator_id,
                'reason' => $reason,
                'lifecycle_status' => StorefrontPaymentDispute::STATUS_OPEN,
                'buyer_email_hash' => hash('sha256', $normalizedEmail),
            ]);

            StorefrontPaymentDisputeEvent::query()->create([
                'storefront_payment_dispute_id' => $dispute->id,
                'from_status' => null,
                'to_status' => StorefrontPaymentDispute::STATUS_OPEN,
                'actor_user_id' => $user->id,
                'actor_role' => 'buyer',
                'note' => $body,
                'created_at' => now(),
            ]);

            $fresh = $dispute->fresh(['conversation.status', 'order', 'creator', 'events']);
            $this->notifyCreated($fresh, $user);

            return ['dispute' => $fresh, 'created' => true];
        });
    }

    /** @return array<string, mixed> */
    public function toArray(StorefrontPaymentDispute $dispute): array
    {
        $dispute->loadMissing(['conversation.status', 'order']);
        $conversation = $dispute->conversation;
        $lifecycle = $dispute->lifecycle_status ?: StorefrontPaymentDispute::STATUS_OPEN;

        return [
            'id' => $dispute->uuid,
            'reason' => $dispute->reason,
            'reason_label' => self::REASON_LABELS[$dispute->reason] ?? $dispute->reason,
            'order_id' => $dispute->order?->uuid,
            'lifecycle_status' => $lifecycle,
            'status' => match ($lifecycle) {
                StorefrontPaymentDispute::STATUS_INVESTIGATING => __('Investigating'),
                StorefrontPaymentDispute::STATUS_RESOLVED => __('Resolved'),
                StorefrontPaymentDispute::STATUS_CLOSED => __('Closed'),
                default => $conversation?->status?->user_label
                    ?? $conversation?->status?->label
                    ?? __('Open'),
            },
            'status_category' => $conversation?->status_category ?? Conversation::STATUS_OPEN,
            'created_at' => $dispute->created_at?->toIso8601String(),
            'updated_at' => $dispute->updated_at?->toIso8601String(),
        ];
    }

    private function notifyCreated(StorefrontPaymentDispute $dispute, User $buyer): void
    {
        $buyer->notify(new PaymentDisputeStatusChangedNotification(
            $dispute->id,
            '',
            StorefrontPaymentDispute::STATUS_OPEN,
            'buyer',
        ));

        if ($dispute->creator) {
            $dispute->creator->notify(new PaymentDisputeStatusChangedNotification(
                $dispute->id,
                '',
                StorefrontPaymentDispute::STATUS_OPEN,
                'creator',
            ));
        }

        $admins = User::query()
            ->whereHas('permissions', fn ($q) => $q->where('name', 'admin.access'))
            ->get();

        if ($admins->isNotEmpty()) {
            Notification::send(
                $admins,
                new PaymentDisputeStatusChangedNotification(
                    $dispute->id,
                    '',
                    StorefrontPaymentDispute::STATUS_OPEN,
                    'admin',
                ),
            );
        }
    }
}
