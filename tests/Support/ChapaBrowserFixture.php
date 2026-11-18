<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Payments\Chapa\ChapaV2Client;
use App\Storefront\Models\StorefrontPaymentAttempt;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/** Synthetic provider responses available only in the guarded browser test server. */
final class ChapaBrowserFixture
{
    public static function register(): void
    {
        self::assertIsolatedEnvironment();

        Http::preventStrayRequests();
        Http::fake([
            'https://api.chapa.co/v1/transaction/initialize' => static fn (Request $request) => self::initialize($request),
            'https://api.chapa.co/v1/transaction/verify/*' => static fn (Request $request) => self::verify($request),
        ]);
    }

    private static function assertIsolatedEnvironment(): void
    {
        if (!app()->environment('testing') || config('database.connections.mysql.database') !== 'belink_test') {
            throw new RuntimeException('Chapa browser fixture requires a disposable test database.');
        }
        if (config('app.url') !== 'http://127.0.0.1:8081' || config('services.chapa.secret') !== 'CHASECK_TEST-isolated-browser-fixture') {
            throw new RuntimeException('Chapa browser fixture requires loopback and a synthetic key.');
        }
    }

    private static function initialize(Request $request): mixed
    {
        $returnUrl = (string) $request['return_url'];
        if (!str_starts_with($returnUrl, 'http://127.0.0.1:8081/')) {
            return Http::response(['status' => 'failed'], 400);
        }

        // Stand in for the hosted provider screen by returning to the actual
        // Linket success URL supplied by the checkout implementation.
        return Http::response(['status' => 'success', 'data' => ['checkout_url' => $returnUrl]]);
    }

    private static function verify(Request $request): mixed
    {
        $reference = basename((string) parse_url($request->url(), PHP_URL_PATH));
        $attempt = StorefrontPaymentAttempt::query()->where('merchant_reference', $reference)->firstOrFail();
        $email = (string) $attempt->order->buyer_email;
        $status = str_starts_with($email, 'e2e-reject-') ? 'failed' : 'success';

        return Http::response(['status' => 'success', 'data' => [
            'status' => $status,
            'amount' => ChapaV2Client::majorFromCents((int) $attempt->amount_cents),
            'currency' => $attempt->currency,
            'tx_ref' => $reference,
            'reference' => 'browser-fixture-'.$reference,
            'email' => $email,
        ]]);
    }
}
