<?php

namespace App\CreatorAi\Support;

use App\CreatorAi\Services\CreatorAiAccess;
use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Payments\Models\ProSubscriptionPayment;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Creates one dedicated verified Pro creator for ChatGPT connection testing.
 * The email and password come from the server environment, never from git.
 */
final class ChatGptProTester
{
    public const REFERENCE = 'LINKET-CHATGPT-TEST-PRO';

    public function seed(): string
    {
        $email = strtolower(trim((string) config('creator_ai.test_pro_email', '')));
        $password = (string) config('creator_ai.test_pro_password', '');

        if ($email === '' || $password === '') {
            return 'skipped';
        }

        if (! filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12) {
            return 'invalid';
        }

        $product = Product::query()
            ->where('system_key', 'pro')
            ->where('free', false)
            ->where('is_default', false)
            ->first();
        $price = $product
            ? Price::query()->where('product_id', $product->id)->where('currency', 'ETB')->orderByDesc('id')->first()
            : null;

        if (! $product || ! $price) {
            return 'missing_plan';
        }

        return DB::transaction(function () use ($email, $password, $product, $price): string {
            $existing = User::query()->where('email', $email)->first();
            $marker = DirectPaymentVerification::query()->where('reference', self::REFERENCE)->first();
            $markedCreatorId = $marker
                ? (int) ProSubscriptionPayment::query()->whereKey($marker->payable_id)->value('creator_id')
                : 0;

            if ($existing && $markedCreatorId !== (int) $existing->id) {
                return 'existing_account';
            }

            $user = $existing ?? new User();
            if (! $existing) {
                $user->name = 'ChatGPT test creator';
                $user->username = $this->username();
                $user->email = $email;
            }
            $user->password = $password;
            $user->email_verified_at ??= now();
            $user->save();

            (new CreateWorkspace())->createPersonalWorkspace($user);

            $subscription = Subscription::query()->firstOrNew([
                'user_id' => $user->id,
                'product_id' => $product->id,
                'gateway_name' => 'verify_et',
            ]);
            $subscription->price_id = $price->id;
            $subscription->gateway_status = 'active';
            $subscription->renews_at = now()->addYear();
            $subscription->ends_at = null;
            $subscription->save();

            $payment = $marker
                ? ProSubscriptionPayment::query()->whereKey($marker->payable_id)->first()
                : null;
            if (! $payment) {
                $payment = new ProSubscriptionPayment();
                $payment->uuid = (string) Str::uuid();
            }
            $payment->creator_id = $user->id;
            $payment->product_id = $product->id;
            $payment->price_id = $price->id;
            $payment->amount_cents = 50000;
            $payment->status = 'paid';
            $payment->paid_at = now()->subDay();
            $payment->subscription_period_start = now()->subDay();
            $payment->subscription_period_end = now()->addYear();
            $payment->save();

            DirectPaymentVerification::query()->updateOrCreate(
                ['reference' => self::REFERENCE],
                [
                    'payable_type' => ProSubscriptionPayment::class,
                    'payable_id' => $payment->id,
                    'bank_code' => 'cbe',
                    'settlement_account' => '0000000000',
                    'amount_cents' => 50000,
                    'currency' => 'ETB',
                    'status' => 'success',
                    'verified_at' => now()->subDay(),
                ],
            );

            return app(CreatorAiAccess::class)->verifiedPro($user->fresh()) ? 'seeded' : 'unverified';
        });
    }

    private function username(): string
    {
        $base = 'chatgpt-tester';
        $username = $base;
        $suffix = 2;
        while (User::query()->where('username', $username)->exists()) {
            $username = $base.'-'.$suffix;
            $suffix++;
        }

        return $username;
    }
}
