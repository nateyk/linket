<?php

namespace App\Storefront;

use App\Storefront\Jobs\SendDigitalProductOrderRecoveryLink;
use App\Storefront\Models\DigitalProductOrderRecovery;
use App\Storefront\Models\DigitalProductOrderRecoveryDelivery;
use App\Storefront\Models\StorefrontOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class OrderRecoveryService
{
    public const COOKIE = 'digital_product_order_recovery';

    public function request(string $email, string $ip): void
    {
        $email = $this->normalizeEmail($email);
        $emailHash = $this->emailHash($email);

        if (
            !filter_var($email, FILTER_VALIDATE_EMAIL) ||
            RateLimiter::tooManyAttempts("digital-product-recovery:email:{$emailHash}", 3) ||
            RateLimiter::tooManyAttempts("digital-product-recovery:ip:{$ip}", 10)
        ) {
            return;
        }

        RateLimiter::hit("digital-product-recovery:email:{$emailHash}", 900);
        RateLimiter::hit("digital-product-recovery:ip:{$ip}", 900);

        if (!StorefrontOrder::query()->where('buyer_email', $email)->where('status', 'paid')->exists()) {
            return;
        }

        $token = Str::random(80);
        $recovery = DigitalProductOrderRecovery::create([
            'uuid' => (string) Str::uuid(),
            'email' => $email,
            'email_hash' => $emailHash,
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addMinutes(30),
        ]);

        DigitalProductOrderRecoveryDelivery::create([
            'digital_product_order_recovery_id' => $recovery->id,
            'email_hash' => $emailHash,
            'masked_email' => $this->maskEmail($email),
            'event' => 'recovery_requested',
            'status' => 'accepted',
        ]);
        $delivery = DigitalProductOrderRecoveryDelivery::create([
            'digital_product_order_recovery_id' => $recovery->id,
            'email_hash' => $emailHash,
            'masked_email' => $this->maskEmail($email),
            'event' => 'recovery_email',
            'status' => 'queued',
        ]);

        SendDigitalProductOrderRecoveryLink::dispatch($recovery->id, $token, $delivery->id)->afterCommit();
    }

    public function redeem(string $token): ?array
    {
        return DB::transaction(function () use ($token): ?array {
            $recovery = DigitalProductOrderRecovery::query()
                ->where('token_hash', hash('sha256', $token))
                ->lockForUpdate()
                ->first();

            if (!$recovery || $recovery->expires_at->isPast() || $recovery->redeemed_at) {
                return null;
            }

            $sessionToken = Str::random(80);
            $recovery->update([
                'redeemed_at' => now(),
                'session_token_hash' => hash('sha256', $sessionToken),
                'session_expires_at' => now()->addMinutes(30),
            ]);

            return [$recovery, $sessionToken];
        });
    }

    public function current(Request $request): ?DigitalProductOrderRecovery
    {
        [$uuid, $token] = array_pad(explode('.', (string) $request->cookie(self::COOKIE), 2), 2, null);
        if (!$uuid || !$token) {
            return null;
        }

        $recovery = DigitalProductOrderRecovery::query()->where('uuid', $uuid)->first();
        if (!$recovery || !$recovery->session_expires_at || $recovery->session_expires_at->isPast()) {
            return null;
        }

        return hash_equals((string) $recovery->session_token_hash, hash('sha256', $token)) ? $recovery : null;
    }

    public function paidOrders(DigitalProductOrderRecovery $recovery)
    {
        return StorefrontOrder::query()
            ->where('buyer_email', $recovery->email)
            ->where('status', 'paid')
            ->with(['product', 'entitlements.file'])
            ->latest('paid_at');
    }

    public function emailHash(string $email): string
    {
        return hash('sha256', $this->normalizeEmail($email));
    }

    public function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        return Str::substr($local, 0, 1) . '***@' . $domain;
    }

    private function normalizeEmail(string $email): string
    {
        return Str::lower(trim($email));
    }
}
