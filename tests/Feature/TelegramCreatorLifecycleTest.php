<?php

namespace Tests\Feature;

use App\Models\User;
use App\Payments\Commands\ProcessDirectSubscriptionRenewals;
use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\CreatorVerificationAllowance;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

final class TelegramCreatorLifecycleTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.telegram.enabled', true);
        config()->set('services.telegram.token', 'synthetic-bot-token');
        Notification::fake();
    }

    public function test_pro_past_due_and_expiry_alert_only_once_without_touching_chapa(): void
    {
        $creator = $this->connectedCreator();
        $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = Price::query()->where('product_id', $plan->id)->firstOrFail();
        $pastDue = Subscription::query()->create([
            'user_id' => $creator->id, 'product_id' => $plan->id,
            'price_id' => $price->id, 'gateway_name' => 'verify_et',
            'gateway_status' => 'active', 'renews_at' => now()->subDays(2),
        ]);
        $expired = Subscription::query()->create([
            'user_id' => $creator->id, 'product_id' => $plan->id,
            'price_id' => $price->id, 'gateway_name' => 'verify_et',
            'gateway_status' => 'past_due', 'renews_at' => now()->subDays(8),
        ]);
        $legacy = Subscription::query()->create([
            'user_id' => $creator->id, 'product_id' => $plan->id,
            'price_id' => $price->id, 'gateway_name' => 'chapa',
            'gateway_status' => 'active', 'renews_at' => now()->subDays(8),
        ]);

        app(ProcessDirectSubscriptionRenewals::class)->handle();
        app(ProcessDirectSubscriptionRenewals::class)->handle();

        $this->assertSame('past_due', $pastDue->fresh()->gateway_status);
        $this->assertSame('expired', $expired->fresh()->gateway_status);
        $this->assertSame('active', $legacy->fresh()->gateway_status);
        Notification::assertSentToTimes($creator, \App\Payments\Notifications\DirectProLifecycleNotification::class, 2);
        Notification::assertSentTo($creator, \App\Payments\Notifications\DirectProLifecycleNotification::class,
            fn ($notification): bool => $notification->event === 'past_due' && $notification->subscriptionId === $pastDue->id);
        Notification::assertSentTo($creator, \App\Payments\Notifications\DirectProLifecycleNotification::class,
            fn ($notification): bool => $notification->event === 'expired' && $notification->subscriptionId === $expired->id);
    }

    public function test_last_three_free_verified_sales_send_one_safe_alert_each(): void
    {
        $creator = $this->connectedCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id, 'user_id' => $creator->id,
            'title' => 'Synthetic guide', 'status' => 'approved',
            'price_cents' => 1000, 'currency' => 'ETB', 'type' => 'digital',
        ]);
        $free = Product::query()->where('system_key', 'free')->firstOrFail();
        $free->update(['storefront_benefits' => [
            ...($free->storefront_benefits ?? []), 'free_verified_sales' => 10,
        ]]);

        for ($count = 1; $count <= 10; $count++) {
            $order = $this->order($creator, $product, 'paid');
            $order->update(['monetization_policy' => CreatorVerificationAllowance::FREE_POLICY]);
            DB::table('creator_verification_allowances')->insert([
                'creator_id' => $creator->id, 'storefront_order_id' => $order->id,
                'status' => 'consumed', 'consumed_at' => now(),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            DirectPaymentVerification::query()->create([
                'reference' => 'FREE'.Str::upper(Str::random(14)),
                'payable_type' => StorefrontOrder::class, 'payable_id' => $order->id,
                'bank_code' => 'cbe', 'settlement_account' => '1000123456789',
                'amount_cents' => 1000, 'currency' => 'ETB',
                'status' => 'success', 'verified_at' => now(),
                'canonical_transaction_identity' => 'FREECOUNT'.$count.Str::upper(Str::random(6)),
            ]);
            app(\App\Storefront\Services\CreatorQuotaTelegramNotifier::class)->notifyFromVerifiedOrder($order);
            app(\App\Storefront\Services\CreatorQuotaTelegramNotifier::class)->notifyFromVerifiedOrder($order);
        }

        Notification::assertSentToTimes(
            $creator, \App\Storefront\Notifications\FreeQuotaMilestoneNotification::class, 3,
        );
        $milestones = Notification::sent(
            $creator, \App\Storefront\Notifications\FreeQuotaMilestoneNotification::class,
        )->map(fn ($n) => $n->consumed)->sort()->values()->all();
        $this->assertSame([8, 9, 10], $milestones);
    }

    public function test_payment_review_alert_requires_real_review_status_and_is_deduped_per_attempt(): void
    {
        $creator = $this->connectedCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id, 'user_id' => $creator->id,
            'title' => 'Review guide', 'status' => 'approved',
            'price_cents' => 1000, 'currency' => 'ETB', 'type' => 'digital',
        ]);
        $order = $this->order($creator, $product, 'verifying');
        $verification = DirectPaymentVerification::query()->create([
            'reference' => 'PRIVATE'.Str::upper(Str::random(14)),
            'payable_type' => StorefrontOrder::class, 'payable_id' => $order->id,
            'bank_code' => 'cbe', 'settlement_account' => '1000123456789',
            'amount_cents' => 1000, 'currency' => 'ETB', 'status' => 'verifying',
        ]);
        $notifier = app(\App\Storefront\Services\CreatorPaymentReviewNotifier::class);

        $notifier->notify($order, $verification->id);
        Notification::assertNothingSent();

        $verification->update(['status' => 'manual_review']);
        $order->update(['status' => 'manual_review']);
        $notifier->notify($order, $verification->id);
        $notifier->notify($order, $verification->id);

        Notification::assertSentToTimes(
            $creator, \App\Storefront\Notifications\PaymentReviewNeededNotification::class, 1,
        );
        Notification::assertSentTo(
            $creator, \App\Storefront\Notifications\PaymentReviewNeededNotification::class,
            function ($notification) use ($creator, $verification): bool {
                $body = json_encode($notification->toTelegram($creator)->toArray(), JSON_THROW_ON_ERROR);
                $this->assertStringNotContainsString($verification->reference, $body);
                $this->assertStringNotContainsString('1000123456789', $body);
                return true;
            },
        );
    }

    public function test_payment_review_and_pro_notifications_respect_creator_mutes_and_ownership(): void
    {
        $creator = $this->connectedCreator();
        $other = $this->connectedCreator();
        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id, 'user_id' => $creator->id,
            'title' => 'Private synthetic guide', 'status' => 'approved',
            'price_cents' => 1000, 'currency' => 'ETB', 'type' => 'digital',
        ]);
        $order = $this->order($creator, $product, 'manual_review');
        $verification = DirectPaymentVerification::query()->create([
            'reference' => 'PRIVATE'.Str::upper(Str::random(14)),
            'payable_type' => StorefrontOrder::class,
            'payable_id' => $order->id,
            'bank_code' => 'cbe',
            'settlement_account' => '1000123456789',
            'amount_cents' => 1000, 'currency' => 'ETB',
            'status' => 'manual_review',
        ]);
        $review = new \App\Storefront\Notifications\PaymentReviewNeededNotification(
            $order->id, $verification->id,
        );
        $this->assertTrue($review->shouldSend($creator, 'telegram'));
        $this->assertFalse($review->shouldSend($other, 'telegram'));

        $plan = Product::query()->where('system_key', 'pro')->firstOrFail();
        $price = Price::query()->where('product_id', $plan->id)->firstOrFail();
        $subscription = Subscription::query()->create([
            'user_id' => $creator->id, 'product_id' => $plan->id,
            'price_id' => $price->id, 'gateway_name' => 'verify_et',
            'gateway_status' => 'past_due', 'renews_at' => now()->subDay(),
        ]);
        $pro = new \App\Payments\Notifications\DirectProLifecycleNotification(
            $subscription->id, 'past_due',
        );
        $this->assertTrue($pro->shouldSend($creator, 'telegram'));
        $this->assertFalse($pro->shouldSend($other, 'telegram'));

        $creator->telegramConnection()->firstOrFail()->forceFill([
            'notification_preferences' => ['payment_review' => false, 'pro_billing' => false],
        ])->save();
        $this->assertFalse($review->shouldSend($creator->fresh(), 'telegram'));
        $this->assertFalse($pro->shouldSend($creator->fresh(), 'telegram'));
    }

    private function connectedCreator(): User
    {
        $creator = User::factory()->create(['email_verified_at' => now()]);
        $creator->telegramConnection()->create([
            'telegram_user_id' => 1234567890777 + $creator->id,
            'telegram_chat_id' => 1234567890777 + $creator->id,
            'connected_at' => now(),
        ]);
        return $creator;
    }

    private function order(User $creator, DigitalProduct $product, string $status): StorefrontOrder
    {
        return StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'digital_product_id' => $product->id, 'creator_id' => $creator->id,
            'currency' => 'ETB', 'gross_amount_cents' => 1000,
            'commission_bps' => 0, 'platform_fee_cents' => 0,
            'creator_earnings_cents' => 1000, 'status' => $status,
            'payment_gateway' => 'verify_et',
        ]);
    }
}
