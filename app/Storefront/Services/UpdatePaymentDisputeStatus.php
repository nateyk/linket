<?php

namespace App\Storefront\Services;

use App\Conversations\Actions\ConversationEventsCreator;
use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationStatus;
use App\Models\User;
use App\Storefront\Models\StorefrontPaymentDispute;
use App\Storefront\Models\StorefrontPaymentDisputeEvent;
use App\Storefront\Notifications\PaymentDisputeStatusChangedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

final class UpdatePaymentDisputeStatus
{
    /** @var array<string, list<string>> */
    private const TRANSITIONS = [
        StorefrontPaymentDispute::STATUS_OPEN => [
            StorefrontPaymentDispute::STATUS_INVESTIGATING,
        ],
        StorefrontPaymentDispute::STATUS_INVESTIGATING => [
            StorefrontPaymentDispute::STATUS_RESOLVED,
            StorefrontPaymentDispute::STATUS_CLOSED,
        ],
        StorefrontPaymentDispute::STATUS_RESOLVED => [
            StorefrontPaymentDispute::STATUS_CLOSED,
        ],
        StorefrontPaymentDispute::STATUS_CLOSED => [],
    ];

    /** @var array<string, list<string>> */
    private const ROLE_ALLOWED = [
        'creator' => [
            StorefrontPaymentDispute::STATUS_INVESTIGATING,
            StorefrontPaymentDispute::STATUS_RESOLVED,
        ],
        'admin' => [
            StorefrontPaymentDispute::STATUS_INVESTIGATING,
            StorefrontPaymentDispute::STATUS_RESOLVED,
            StorefrontPaymentDispute::STATUS_CLOSED,
        ],
    ];

    /**
     * @return array{dispute: StorefrontPaymentDispute, changed: bool}
     */
    public function execute(
        StorefrontPaymentDispute $dispute,
        string $status,
        User $actor,
        string $actorRole,
        ?string $note = null,
    ): array {
        $status = strtolower(trim($status));
        $allowedForRole = self::ROLE_ALLOWED[$actorRole] ?? [];
        if (! in_array($status, $allowedForRole, true)) {
            throw ValidationException::withMessages([
                'status' => __('You cannot set this dispute status.'),
            ]);
        }

        return DB::transaction(function () use ($dispute, $status, $actor, $actorRole, $note): array {
            /** @var StorefrontPaymentDispute $locked */
            $locked = StorefrontPaymentDispute::query()
                ->whereKey($dispute->id)
                ->lockForUpdate()
                ->firstOrFail();

            $from = $locked->lifecycle_status ?: StorefrontPaymentDispute::STATUS_OPEN;

            if ($from === $status) {
                return ['dispute' => $locked->fresh(['events', 'conversation.status', 'order']), 'changed' => false];
            }

            $allowed = self::TRANSITIONS[$from] ?? [];
            if (! in_array($status, $allowed, true)) {
                throw ValidationException::withMessages([
                    'status' => __('This dispute cannot move from :from to :to.', [
                        'from' => $from,
                        'to' => $status,
                    ]),
                ]);
            }

            $locked->update(['lifecycle_status' => $status]);

            StorefrontPaymentDisputeEvent::query()->create([
                'storefront_payment_dispute_id' => $locked->id,
                'from_status' => $from,
                'to_status' => $status,
                'actor_user_id' => $actor->id,
                'actor_role' => $actorRole,
                'note' => $note !== null && trim($note) !== '' ? trim($note) : null,
                'created_at' => now(),
            ]);

            $this->syncConversationStatus($locked, $status, $actor, $note);

            $fresh = $locked->fresh(['events', 'conversation.status', 'order', 'creator']);
            $this->notifyParties($fresh, $from, $status, $note);

            return ['dispute' => $fresh, 'changed' => true];
        });
    }

    private function syncConversationStatus(
        StorefrontPaymentDispute $dispute,
        string $status,
        User $actor,
        ?string $note,
    ): void {
        $conversation = $dispute->conversation;
        if (! $conversation) {
            return;
        }

        $conversationStatus = match ($status) {
            StorefrontPaymentDispute::STATUS_INVESTIGATING => $this->statusForCategory(Conversation::STATUS_PENDING, 'Investigating', 'Being investigated'),
            StorefrontPaymentDispute::STATUS_RESOLVED => $this->statusForCategory(Conversation::STATUS_CLOSED, 'Resolved', 'Resolved'),
            StorefrontPaymentDispute::STATUS_CLOSED => $this->statusForCategory(Conversation::STATUS_LOCKED, 'Locked', 'Closed'),
            default => ConversationStatus::getDefaultOpen(),
        };

        if ((int) $conversation->status_id !== (int) $conversationStatus->id) {
            Conversation::changeStatus($conversationStatus, [$conversation]);
            if (in_array($status, [StorefrontPaymentDispute::STATUS_RESOLVED, StorefrontPaymentDispute::STATUS_CLOSED], true)) {
                (new ConversationEventsCreator($conversation))->closedByAgent($actor);
            }
        }

        if ($note !== null && trim($note) !== '') {
            (new ConversationEventsCreator($conversation))->createEvent('dispute.status_note', [
                'note' => trim($note),
                'status' => $status,
            ]);
        }
    }

    private function statusForCategory(string $category, string $label, string $userLabel): ConversationStatus
    {
        $existing = ConversationStatus::query()
            ->where('category', $category)
            ->where('label', $label)
            ->first();

        if ($existing) {
            return $existing;
        }

        $byCategory = ConversationStatus::query()->where('category', $category)->first();
        if ($byCategory) {
            return $byCategory;
        }

        return ConversationStatus::query()->create([
            'label' => $label,
            'user_label' => $userLabel,
            'category' => $category,
            'internal' => true,
            'active' => true,
        ]);
    }

    private function notifyParties(
        StorefrontPaymentDispute $dispute,
        string $from,
        string $to,
        ?string $note,
    ): void {
        $creator = $dispute->creator;
        if ($creator) {
            $creator->notify(new PaymentDisputeStatusChangedNotification(
                $dispute->id,
                $from,
                $to,
                'creator',
                $note,
            ));
        }

        $buyerEmail = strtolower(trim((string) $dispute->order?->buyer_email));
        if ($buyerEmail !== '') {
            $buyer = User::query()->whereRaw('LOWER(email) = ?', [$buyerEmail])->first()
                ?? User::findBySecondaryEmail($buyerEmail);
            if ($buyer) {
                $buyer->notify(new PaymentDisputeStatusChangedNotification(
                    $dispute->id,
                    $from,
                    $to,
                    'buyer',
                    $note,
                ));
            }
        }

        $admins = User::query()
            ->whereHas('permissions', fn ($q) => $q->where('name', 'admin.access'))
            ->get();

        if ($admins->isNotEmpty()) {
            Notification::send(
                $admins,
                new PaymentDisputeStatusChangedNotification(
                    $dispute->id,
                    $from,
                    $to,
                    'admin',
                    $note,
                ),
            );
        }
    }
}
