<?php

namespace App\Payments\VerifyEt;

use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\StorefrontOrder;
use App\Storefront\Services\StorefrontVerificationSession;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

final class VerifyEtFailureHandler
{
    public function __construct(
        private readonly VerifyEtHealth $health,
    ) {}

    /**
     * Handle provider exceptions gracefully with auditing and alerting.
     */
    public function handle(DirectPaymentVerification $verification, VerifyEtException $exception): string
    {
        $this->health->reportFailure();

        $status = $this->resolveFailureStatus($exception->httpStatus, $exception->providerCode);

        $verification->update([
            'status' => $status,
            'latest_error_code' => $exception->providerCode,
            'latest_error' => $exception->getMessage(),
        ]);

        if ($status === 'mismatch' && $verification->payable_type === StorefrontOrder::class) {
            $order = StorefrontOrder::query()->find($verification->payable_id);
            if ($order) {
                app(StorefrontVerificationSession::class)->recordMismatch($order, $verification);
            }
        }

        if ($exception->httpStatus === 402) {
            $this->handleCreditExhaustion($verification->id, $exception->providerCode);
        } elseif (in_array($exception->httpStatus, [401, 403], true)) {
            $this->handleAuthFailure($verification->id, $exception->httpStatus, $exception->providerCode);
        }

        return $status;
    }

    private function resolveFailureStatus(int $httpStatus, ?string $providerCode): string
    {
        if ($this->buyerHttpRejection($httpStatus, $providerCode)) {
            return 'mismatch';
        }

        if ($httpStatus === 409) {
            return 'manual_review';
        }

        return 'verifying';
    }

    private function buyerHttpRejection(int $httpStatus, ?string $providerCode): bool
    {
        if (in_array($providerCode, ['not_found', 'invalid_input', 'verification_not_successful'], true)) {
            return true;
        }

        return in_array($httpStatus, [400, 404, 422], true);
    }

    private function handleCreditExhaustion(int|string $verificationId, ?string $providerCode): void
    {
        Log::critical('verify_et.credits_exhausted', [
            'verification_id' => $verificationId,
            'code' => $providerCode,
        ]);

        $email = VerifyEtSettings::get('alert_email');
        if ($email) {
            Mail::raw('Verify.et verification credits require attention.', static function ($message) use ($email): void {
                $message->to($email)->subject('Verify.et credits require attention');
            });
        }
    }

    private function handleAuthFailure(int|string $verificationId, int $httpStatus, ?string $providerCode): void
    {
        Log::critical('verify_et.credentials_or_permissions_invalid', [
            'verification_id' => $verificationId,
            'http_status' => $httpStatus,
            'code' => $providerCode,
        ]);

        $email = VerifyEtSettings::get('alert_email');
        if ($email) {
            RateLimiter::attempt(
                'verify-et:authentication-alert',
                static function () use ($email): void {
                    Mail::raw('Verify.et rejected Linket credentials or scoped API permissions.', static function ($message) use ($email): void {
                        $message->to($email)->subject('Verify.et integration configuration requires attention');
                    });
                },
                1,
                300,
            );
        }
    }
}
