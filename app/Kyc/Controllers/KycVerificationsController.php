<?php

namespace App\Kyc\Controllers;

use App\Kyc\KycVerificationService;
use App\Kyc\Models\KycVerification;
use App\Kyc\Resources\KycVerificationResource;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class KycVerificationsController extends Controller
{
    public function status(): array
    {
        Gate::allowIf(fn() => Auth::check());
        $user = request()->user();
        $verification = $user->latestKycVerification;

        return [
            'status' => $user->kyc_status,
            'is_required' => $user->isKycRequired(),
            'verification' => $verification
                ? new KycVerificationResource($verification)
                : null,
        ];
    }

    public function store(): KycVerificationResource
    {
        Gate::allowIf(fn() => Auth::check());
        $user = request()->user();
        $kycVerification = app(KycVerificationService::class)->submit(
            $user,
            request()->all(),
        );

        return new KycVerificationResource($kycVerification);
    }

    public function document(string $key): StreamedResponse
    {
        Gate::allowIf(fn() => Auth::check());
        $user = request()->user();
        $verification = $user->latestKycVerification;
        abort_if(!$verification, 404);

        $path = app(KycVerificationService::class)->documentPath(
            $verification,
            $key,
        );
        abort_unless($path && Storage::disk('local')->exists($path), 404);
        abort_unless(
            str_starts_with($path, "kyc/docs/{$user->id}/"),
            403,
        );

        return Storage::disk('local')->response($path);
    }
}
