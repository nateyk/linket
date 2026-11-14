<?php

declare(strict_types=1);

namespace App\Storefront\Services;

use App\Biolinks\Models\Biolink;
use App\Models\User;
use App\Payments\Chapa\ChapaV2Client;
use App\Payments\Chapa\LinketChapaManager;
use App\Stores\Models\Store;
use App\Storefront\Models\CreatorChapaGateway;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Models\StorefrontPaymentAttempt;
use App\Storefront\VisitorAttributes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ChapaStorefrontCheckout
{
    public function __construct(
        private readonly ?LinketChapaManager $chapaManager = null,
        private readonly ?CreatorVerificationAllowance $allowance = null,
        private readonly ?AccountMonetizationStatus $monetizationStatus = null,
        private readonly ?StorefrontPaymentReferenceGenerator $referenceGenerator = null,
        private readonly ?\Closure $isProChecker = null,
    ) {
    }

    /** @param array<string, mixed> $buyer */
    public function create(DigitalProduct $product, Biolink|Store|null $store, array $buyer): StorefrontOrder
    {
        return DB::transaction(function () use ($product, $store, $buyer): StorefrontOrder {
            $creator = User::query()->whereKey($product->user_id)->lockForUpdate()->firstOrFail();

            if ($this->manager()->isEnabled()) {
                return $this->createPlatformOrder($product, $store, $buyer, $creator);
            }

            return $this->createLegacySellerOrder($product, $store, $buyer, $creator);
        }, 3);
    }

    /**
     * Platform-collected Chapa checkout: collects directly to Linket merchant.
     * Available to both Free and Pro creators.
     *
     * @param array<string, mixed> $buyer
     */
    public function createPlatformOrder(
        DigitalProduct $product,
        Biolink|Store|null $store,
        array $buyer,
        User $creator,
    ): StorefrontOrder {
        $this->validateProductAndCreator($product, $creator);

        $policy = $this->isProCreator($creator)
            ? CreatorVerificationAllowance::PRO_POLICY
            : CreatorVerificationAllowance::FREE_POLICY;

        $reference = $this->refGenerator()->generate();
        $order = $this->persistPlatformOrder($product, $creator, [
            'store' => $store,
            'buyer' => $buyer,
            'policy' => $policy,
            'reference' => $reference,
        ]);

        $attempt = StorefrontPaymentAttempt::query()->create([
            'order_id' => $order->id,
            'merchant_reference' => $reference,
            'idempotency_key' => (string) Str::uuid(),
            'amount_cents' => (int) $product->price_cents,
            'currency' => 'ETB',
            'status' => StorefrontPaymentAttempt::STATUS_INITIALIZING,
        ]);

        $session = $this->initiatePlatformSession($product, $buyer, $reference, $attempt->idempotency_key);

        $attempt->update([
            'status' => StorefrontPaymentAttempt::STATUS_PENDING,
            'chapa_reference' => $session->chapaReference,
            'checkout_url' => $session->checkoutUrl,
        ]);

        $order->setAttribute('chapaCheckoutUrl', $session->checkoutUrl);

        return $order;
    }

    /**
     * Legacy seller-collected Chapa checkout using seller keys.
     *
     * @param array<string, mixed> $buyer
     */
    public function createLegacySellerOrder(
        DigitalProduct $product,
        Biolink|Store|null $store,
        array $buyer,
        User $creator,
    ): StorefrontOrder {
        $this->validateProductAndCreator($product, $creator);
        abort_unless($this->getAllowance()->isPro($creator), 403, __('Chapa checkout is available on Pro.'));

        $gateway = CreatorChapaGateway::query()->where('workspace_id', $product->workspace_id)->first();
        abort_unless($gateway, 422, __('Connect Chapa before taking payments.'));

        $reference = 'lk'.Str::lower(Str::random(16));
        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'monetization_policy' => CreatorVerificationAllowance::PRO_POLICY,
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_CREATOR_CHAPA,
            'digital_product_id' => $product->id,
            'biolink_id' => $store?->id,
            'creator_id' => $product->user_id,
            'buyer_user_id' => auth()->id(),
            'buyer_name' => $buyer['name'] ?? null,
            'buyer_email' => $buyer['email'] ?? null,
            'currency' => 'ETB',
            'gross_amount_cents' => $product->price_cents,
            'commission_bps' => 0,
            'platform_fee_percent' => 0,
            'platform_fee_cents' => 0,
            'creator_earnings_cents' => $product->price_cents,
            'status' => 'pending_payment',
            'payment_gateway' => 'chapa',
            'chapa_tx_ref' => $reference,
            'buyer_country' => VisitorAttributes::country(),
            'buyer_referrer' => VisitorAttributes::normalizedReferrer(),
        ]);
        $order->items()->create([
            'digital_product_id' => $product->id,
            'title' => $product->title,
            'unit_amount_cents' => $product->price_cents,
        ]);

        $customer = $this->formatCustomer($buyer);
        $returnUrl = url('storefront/chapa/return/'.$reference);
        $hosted = app(ChapaV2Client::class)->createHostedPayment($gateway->secret_key, [
            'amount_cents' => (int) $product->price_cents,
            'currency' => 'ETB',
            'merchant_reference' => $reference,
            'idempotency_key' => $order->uuid,
            'callback_url' => $returnUrl,
            'return_url' => $returnUrl,
            'customer' => $customer === [] ? null : $customer,
            'customization' => [
                'title' => (string) config('app.name'),
                'description' => Str::limit((string) $product->title, 150),
            ],
        ]);

        $order->setAttribute('chapaCheckoutUrl', $hosted['checkout_url']);

        return $order;
    }

    private function validateProductAndCreator(DigitalProduct $product, User $creator): void
    {
        abort_unless($this->monetization()->canSell($creator), 403, __('Temporarily unavailable.'));
        abort_unless(strtoupper((string) $product->currency) === 'ETB', 422);
        abort_unless((int) $product->price_cents >= 100, 422);
    }

    /** @param array{store: Biolink|Store|null, buyer: array<string, mixed>, policy: string, reference: string} $details */
    private function persistPlatformOrder(
        DigitalProduct $product,
        User $creator,
        array $details,
    ): StorefrontOrder {
        $buyer = $details['buyer'];
        $order = StorefrontOrder::query()->create([
            'uuid' => (string) Str::uuid(),
            'monetization_policy' => $details['policy'],
            'collection_owner' => StorefrontOrder::COLLECTION_OWNER_PLATFORM_CHAPA,
            'digital_product_id' => $product->id,
            'biolink_id' => $details['store']?->id,
            'creator_id' => $creator->id,
            'buyer_user_id' => auth()->id(),
            'buyer_name' => $buyer['name'] ?? null,
            'buyer_email' => $buyer['email'] ?? null,
            'currency' => 'ETB',
            'gross_amount_cents' => $product->price_cents,
            'commission_bps' => 0,
            'platform_fee_percent' => 0,
            'platform_fee_cents' => 0,
            'creator_earnings_cents' => $product->price_cents,
            'status' => 'pending_payment',
            'payment_gateway' => 'chapa',
            'chapa_tx_ref' => $details['reference'],
            'buyer_country' => VisitorAttributes::country(),
            'buyer_referrer' => VisitorAttributes::normalizedReferrer(),
        ]);

        $order->items()->create([
            'digital_product_id' => $product->id,
            'title' => $product->title,
            'unit_amount_cents' => $product->price_cents,
        ]);

        return $order;
    }

    /** @param array<string, mixed> $buyer */
    private function initiatePlatformSession(
        DigitalProduct $product,
        array $buyer,
        string $reference,
        string $idempotencyKey,
    ): \Nateyk\Chapa\Dto\HostedCheckoutSession {
        $customer = $this->formatCustomer($buyer);
        $returnUrl = url('storefront/chapa/return/'.$reference);
        $callbackUrl = url('billing/chapa/webhook');

        return $this->manager()->platformClient()->payments()->hostedTyped([
            'amount' => (int) $product->price_cents,
            'currency' => 'ETB',
            'merchant_reference' => $reference,
            'callback_url' => $callbackUrl,
            'return_url' => $returnUrl,
            'customer' => $customer === [] ? null : $customer,
            'customization' => [
                'title' => (string) config('app.name'),
                'description' => Str::limit((string) $product->title, 150),
            ],
        ], $idempotencyKey);
    }

    /**
     * @param array<string, mixed> $buyer
     * @return array<string, mixed>
     */
    private function formatCustomer(array $buyer): array
    {
        [$firstName, $lastName] = $this->splitBuyerName($buyer['name'] ?? null);

        return array_filter([
            'email' => $buyer['email'] ?? null,
            'phone_number' => $buyer['phone'] ?? null,
            'first_name' => $firstName,
            'last_name' => $lastName,
        ], fn (mixed $value): bool => filled($value));
    }

    /** @return array{0: string|null, 1: string|null} */
    private function splitBuyerName(?string $name): array
    {
        $parts = preg_split('/\s+/', trim((string) $name), 2) ?: [];

        return [$parts[0] ?? null, $parts[1] ?? null];
    }

    private function isProCreator(User $creator): bool
    {
        if ($this->isProChecker !== null) {
            return ($this->isProChecker)($creator);
        }

        return $this->getAllowance()->isPro($creator);
    }

    private function manager(): LinketChapaManager
    {
        return $this->chapaManager ?? app(LinketChapaManager::class);
    }

    private function getAllowance(): CreatorVerificationAllowance
    {
        return $this->allowance ?? app(CreatorVerificationAllowance::class);
    }

    private function monetization(): AccountMonetizationStatus
    {
        return $this->monetizationStatus ?? app(AccountMonetizationStatus::class);
    }

    private function refGenerator(): StorefrontPaymentReferenceGenerator
    {
        return $this->referenceGenerator ?? app(StorefrontPaymentReferenceGenerator::class);
    }
}
