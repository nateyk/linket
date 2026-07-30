<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProductPayoutMethod;
use App\Storefront\Resources\DigitalProductPayoutMethodResource;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class DigitalProductPayoutMethodController extends Controller
{
    public function show(Request $request): DigitalProductPayoutMethodResource
    {
        $method = DigitalProductPayoutMethod::query()
            ->where('workspace_id', ActiveWorkspace::get()->id)
            ->where('creator_id', $request->user()->id)
            ->firstOrFail();

        return new DigitalProductPayoutMethodResource($method);
    }

    public function update(Request $request): DigitalProductPayoutMethodResource
    {
        $data = $request->validate([
            'type' => 'required|in:bank_transfer,paypal,other',
            'account_holder' => 'required|string|max:160',
            'destination' => 'required|string|max:500',
        ]);

        $workspaceId = ActiveWorkspace::get()->id;
        $method = DigitalProductPayoutMethod::query()->updateOrCreate(
            ['workspace_id' => $workspaceId, 'creator_id' => $request->user()->id],
            [
                ...$data,
                'display_label' => $this->displayLabel($data['type'], $data['destination']),
            ],
        );

        return new DigitalProductPayoutMethodResource($method);
    }

    private function displayLabel(string $type, string $destination): string
    {
        $suffix = Str::of($destination)->replaceMatches('/\\s+/', '')->substr(-4)->value();

        return match ($type) {
            'bank_transfer' => __('Bank transfer ending in :suffix', ['suffix' => $suffix]),
            'paypal' => __('PayPal ending in :suffix', ['suffix' => $suffix]),
            default => __('Manual payout ending in :suffix', ['suffix' => $suffix]),
        };
    }
}
