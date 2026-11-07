<?php

namespace App\Payments;

use App\Payments\Chapa\ChapaV2Client;
use App\Payments\Models\PaymentTransaction;
use Common\Settings\Settings;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class ChapaGateway
{
    public function isEnabled(): bool
    {
        return (bool) app(Settings::class)->get('billing.chapa.enable', true)
            && filled($this->platformSecret());
    }

    public function createTransaction(
        object $payable,
        string $purpose,
        string $amount,
        string $returnUrl,
        string $description,
        array $buyer = [],
    ): PaymentTransaction {
        abort_unless($this->isEnabled(), 503, 'Chapa payments are not configured.');

        $transaction = PaymentTransaction::create([
            'uuid' => (string) Str::uuid(),
            'payable_type' => $payable::class,
            'payable_id' => $payable->getKey(),
            'purpose' => $purpose,
            'tx_ref' => 'lk'.Str::lower(Str::random(16)),
            'amount' => $amount,
            'currency' => 'ETB',
            'buyer_name' => $buyer['name'] ?? null,
            'buyer_email' => $buyer['email'] ?? null,
        ]);

        try {
            [$firstName, $lastName] = $this->splitBuyerName($buyer['name'] ?? null);
            $customer = array_filter([
                'email' => $buyer['email'] ?? null,
                'phone_number' => $buyer['phone'] ?? null,
                'first_name' => $firstName,
                'last_name' => $lastName,
            ], fn (mixed $value): bool => filled($value));
            $payload = app(ChapaV2Client::class)->createHostedPayment($this->platformSecret(), [
                'amount_cents' => ChapaV2Client::centsFromMajor($amount),
                'currency' => 'ETB',
                'merchant_reference' => $transaction->tx_ref,
                'idempotency_key' => $transaction->uuid,
                'return_url' => str_replace('{tx_ref}', $transaction->tx_ref, $returnUrl),
                'callback_url' => url("billing/chapa/callback/{$transaction->tx_ref}"),
                'customer' => $customer === [] ? null : $customer,
                'customization' => [
                    'title' => (string) config('app.name'),
                    'description' => Str::limit($description, 150),
                ],
            ]);
        } catch (Throwable $e) {
            $transaction->update([
                'status' => 'failed',
                'verification_data' => [
                    'failure_reason' => 'payment_initialization_failed',
                ],
            ]);

            throw $e;
        }

        $checkoutUrl = $payload['checkout_url'] ?? null;
        if (!is_string($checkoutUrl) || blank($checkoutUrl)) {
            $transaction->update([
                'status' => 'failed',
                'verification_data' => [
                    'failure_reason' => 'missing_checkout_url',
                ],
            ]);
            throw new RuntimeException('Chapa did not return a checkout URL.');
        }

        $transaction->update(['checkout_url' => $checkoutUrl]);
        return $transaction->fresh();
    }

    public function signatureIsValid(Request $request): bool
    {
        $secret = $this->webhookSecret();
        $signature = $request->header('x-chapa-signature');

        return filled($secret)
            && is_string($signature)
            && hash_equals(
                hash_hmac('sha256', $request->getContent(), $secret),
                $signature,
            );
    }

    public function verify(PaymentTransaction $transaction): array
    {
        $data = app(ChapaV2Client::class)->verifyPayment(
            $this->platformSecret(),
            $transaction->tx_ref,
        );

        return ['data' => $this->normalizeVerifiedPayment($data)];
    }

    /** @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function normalizeVerifiedPayment(array $data): array
    {
        $customer = (array) ($data['customer'] ?? []);
        $amount = $data['amount'] ?? 0;

        return [
            'status' => $data['status'] ?? null,
            'amount' => is_int($amount) || (is_string($amount) && ctype_digit($amount))
                ? ChapaV2Client::majorFromCents((int) $amount)
                : $amount,
            'currency' => $data['currency'] ?? null,
            'tx_ref' => $data['merchant_reference'] ?? ($data['tx_ref'] ?? null),
            'id' => $data['chapa_reference'] ?? ($data['id'] ?? null),
            'email' => $customer['email'] ?? ($data['email'] ?? null),
            'first_name' => $customer['first_name'] ?? ($data['first_name'] ?? null),
            'last_name' => $customer['last_name'] ?? ($data['last_name'] ?? null),
        ];
    }

    public function verifiedData(array $response): array
    {
        return (array) ($response['data'] ?? $response);
    }

    public function isSuccessful(array $data): bool
    {
        return strtolower((string) Arr::get($data, 'status')) === 'success';
    }

    public function platformSecret(): string
    {
        $stored = app(Settings::class)->get('billing.chapa.secret_key');

        return filled($stored) ? (string) $stored : (string) config('services.chapa.secret');
    }

    public function webhookSecret(): ?string
    {
        return app(Settings::class)->get('billing.chapa.webhook_secret')
            ?: config('services.chapa.webhook_secret');
    }

    private function splitBuyerName(?string $name): array
    {
        $parts = preg_split('/\s+/', trim((string) $name), 2) ?: [];

        return [$parts[0] ?? null, $parts[1] ?? null];
    }
}
