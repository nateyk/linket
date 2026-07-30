<?php

namespace App\Payments;

use App\Payments\Models\PaymentTransaction;
use Chapa\Chapa\Chapa;
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
            && filled(config('services.chapa.secret'));
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
            'tx_ref' => 'linket_' . Str::lower(Str::random(32)),
            'amount' => $amount,
            'currency' => 'ETB',
            'buyer_name' => $buyer['name'] ?? null,
            'buyer_email' => $buyer['email'] ?? null,
        ]);

        try {
            [$firstName, $lastName] = $this->splitBuyerName($buyer['name'] ?? null);
            $payload = app(Chapa::class)->initializePayment([
                'amount' => number_format((float) $amount, 2, '.', ''),
                'currency' => 'ETB',
                'tx_ref' => $transaction->tx_ref,
                'return_url' => str_replace('{tx_ref}', $transaction->tx_ref, $returnUrl),
                'callback_url' => url("billing/chapa/callback/{$transaction->tx_ref}"),
                'customization' => [
                    'title' => config('app.name'),
                    'description' => Str::limit($description, 150),
                ],
                ...array_filter([
                    'email' => $buyer['email'] ?? null,
                    'phone_number' => $buyer['phone'] ?? null,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                ]),
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

        $checkoutUrl = data_get($payload, 'data.checkout_url') ?? data_get($payload, 'checkout_url');
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
        config(['chapa.secretKey' => config('services.chapa.secret')]);
        return (array) app(Chapa::class)->verifyTransaction($transaction->tx_ref);
    }

    public function verifiedData(array $response): array
    {
        return (array) ($response['data'] ?? $response);
    }

    public function isSuccessful(array $data): bool
    {
        return strtolower((string) Arr::get($data, 'status')) === 'success';
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
