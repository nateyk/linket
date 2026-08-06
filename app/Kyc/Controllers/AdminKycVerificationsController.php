<?php

namespace App\Kyc\Controllers;

use App\Kyc\KycVerificationService;
use App\Kyc\Models\KycVerification;
use App\Kyc\Resources\KycVerificationResource;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminKycVerificationsController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('admin.access');
        return KycVerificationResource::collection(
            KycVerification::query()
                ->with('user')
                ->when(
                    $request->string('status')->isNotEmpty(),
                    fn($query) => $query->where('status', $request->string('status')),
                )
                ->when(
                    $request->string('query')->isNotEmpty(),
                    fn($query) => $query->where(function ($q) use ($request) {
                        $q
                            ->where('document_number', 'like', "%{$request->string('query')}%")
                            ->orWhereHas(
                                'user',
                                fn($uq) => $uq
                                    ->where('name', 'like', "%{$request->string('query')}%")
                                    ->orWhere('email', 'like', "%{$request->string('query')}%"),
                            );
                    }),
                )
                ->latest()
                ->paginate(15),
        );
    }

    public function show(KycVerification $kycVerification): KycVerificationResource
    {
        Gate::authorize('admin.access');
        return new KycVerificationResource(
            $kycVerification->load(['user', 'reviewer']),
        );
    }

    public function approve(KycVerification $kycVerification): KycVerificationResource
    {
        Gate::authorize('admin.access');
        return new KycVerificationResource(
            app(KycVerificationService::class)->approve(
                $kycVerification,
                request()->user(),
            ),
        );
    }

    public function reject(Request $request, KycVerification $kycVerification): KycVerificationResource
    {
        Gate::authorize('admin.access');
        $data = $request->validate([
            'reason' => ['required', 'string', 'max:2000'],
        ]);
        return new KycVerificationResource(
            app(KycVerificationService::class)->reject(
                $kycVerification,
                $request->user(),
                $data['reason'],
            ),
        );
    }

    public function document(
        KycVerification $kycVerification,
        string $key,
    ): StreamedResponse {
        Gate::authorize('admin.access');
        $path = app(KycVerificationService::class)->documentPath(
            $kycVerification,
            $key,
        );
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path);
    }
}
