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

        $search = $request->string('search');
        $status = $request->string('status');
        $documentType = $request->string('document_type');

        $query = KycVerification::query()->with('user');

        $query->when($search->isNotEmpty(), function ($q) use ($search) {
            $q->where(function ($q) use ($search) {
                $q->where('document_number', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('username', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        });

        $query->when($status->isNotEmpty(), fn($q) => $q->where('status', $status));
        $query->when($documentType->isNotEmpty(), fn($q) => $q->where('document_type', $documentType));

        $counters = [
            'pending' => [
                'total' => KycVerification::where('status', KycVerification::STATUS_PENDING)->count(),
            ],
            'approved' => [
                'total' => KycVerification::where('status', KycVerification::STATUS_APPROVED)->count(),
            ],
            'rejected' => [
                'total' => KycVerification::where('status', KycVerification::STATUS_REJECTED)->count(),
            ],
        ];

        $verifications = $query->latest()->paginate((int) $request->input('perPage', 15));
        $verifications->appends($request->only(['search', 'status', 'document_type', 'perPage']));

        return (KycVerificationResource::collection($verifications))
            ->additional(['meta' => ['counters' => $counters]]);
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

    public function destroy(KycVerification $kycVerification): \Illuminate\Http\JsonResponse
    {
        Gate::authorize('admin.access');
        $kycVerification->delete();

        return response()->json(['message' => __('Deleted Successfully')]);
    }
}
