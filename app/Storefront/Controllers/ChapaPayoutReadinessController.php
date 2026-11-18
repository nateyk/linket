<?php

declare(strict_types=1);

namespace App\Storefront\Controllers;

use App\Storefront\Services\ChapaV1PayoutMode;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

/** Safe admin-only status; secrets are never returned to the browser. */
final class ChapaPayoutReadinessController extends Controller
{
    public function __invoke(Request $request, ChapaV1PayoutMode $mode): array
    {
        Gate::authorize('admin.access');

        return ['data' => [
            ...$mode->status(),
            'approval_url' => rtrim((string) config('app.url'), '/').'/api/v1/chapa/transfer-approval',
            'admin_step_up_required' => (bool) config('services.chapa.admin_payout_step_up_required', false),
        ]];
    }
}
