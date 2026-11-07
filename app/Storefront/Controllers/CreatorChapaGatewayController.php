<?php

namespace App\Storefront\Controllers;

use App\Payments\Chapa\ChapaV2Client;
use App\Storefront\Models\CreatorChapaGateway;
use App\Storefront\Services\CreatorVerificationAllowance;
use Common\Workspaces\ActiveWorkspace;
use Common\Workspaces\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CreatorChapaGatewayController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $workspace = $this->workspace();
        $gateway = CreatorChapaGateway::query()->where('workspace_id', $workspace->id)->first();

        return response()->json(['data' => $this->payload($workspace, $gateway)])
            ->header('Cache-Control', 'no-store, private');
    }

    public function update(Request $request): JsonResponse
    {
        $workspace = $this->workspace();
        abort_unless(app(CreatorVerificationAllowance::class)->isPro($request->user()), 403, __('Chapa is available on Pro.'));
        $data = $request->validate([
            'public_key' => ['required', 'string', 'max:255'],
            'secret_key' => ['required', 'string', 'max:255'],
        ]);
        if (!app(ChapaV2Client::class)->secretAuthenticates($data['secret_key'])) {
            throw ValidationException::withMessages([
                'secret_key' => __('Chapa did not accept this secret key.'),
            ]);
        }

        $gateway = CreatorChapaGateway::query()->updateOrCreate(
            ['workspace_id' => $workspace->id],
            [
                'user_id' => $request->user()->id,
                'public_key' => $data['public_key'],
                'secret_key' => $data['secret_key'],
            ],
        );

        return response()->json(['data' => $this->payload($workspace->fresh(), $gateway)])
            ->header('Cache-Control', 'no-store, private');
    }

    public function updateCollector(Request $request): JsonResponse
    {
        $workspace = $this->workspace();
        $data = $request->validate([
            'collector' => ['required', 'string', Rule::in(['verify_et', 'chapa'])],
        ]);
        if ($data['collector'] === 'chapa') {
            abort_unless(app(CreatorVerificationAllowance::class)->isPro($request->user()), 403, __('Chapa is available on Pro.'));
            abort_unless(
                CreatorChapaGateway::query()->where('workspace_id', $workspace->id)->exists(),
                422,
                __('Connect Chapa before selecting it.'),
            );
        }

        $workspace->update(['active_payment_collector' => $data['collector']]);

        return response()->json([
            'data' => $this->payload($workspace->fresh(), CreatorChapaGateway::query()->where('workspace_id', $workspace->id)->first()),
        ])->header('Cache-Control', 'no-store, private');
    }

    private function workspace(): Workspace
    {
        $workspace = ActiveWorkspace::get();
        abort_unless($workspace, 404);

        return $workspace;
    }

    /** @return array<string, mixed> */
    private function payload(Workspace $workspace, ?CreatorChapaGateway $gateway): array
    {
        $pro = app(CreatorVerificationAllowance::class)->isPro(request()->user());

        return [
            'collector' => $workspace->active_payment_collector ?: 'verify_et',
            'has_secret' => $gateway !== null,
            'public_key_masked' => $gateway?->maskedPublicKey(),
            'chapa_checkout_available' => $pro && $gateway !== null && $workspace->active_payment_collector === 'chapa',
            'pro' => $pro,
        ];
    }
}
