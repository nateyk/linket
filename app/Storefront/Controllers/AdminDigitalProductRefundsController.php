<?php

namespace App\Storefront\Controllers;

use App\Payments\Models\PaymentTransaction;
use App\Storefront\DigitalProductRefundService;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

class AdminDigitalProductRefundsController extends Controller
{
    public function store(Request $request, PaymentTransaction $paymentTransaction): array
    {
        Gate::authorize('admin.access');
        $data = $request->validate([
            'amount_cents' => ['required', 'integer', 'min:1'],
            'reason' => ['required', 'string', 'max:2000'],
            'external_reference' => ['required', 'string', 'max:190'],
            'refunded_at' => ['nullable', 'date'],
        ]);
        $refund = app(DigitalProductRefundService::class)->record($paymentTransaction, $request->user()->id, $data);

        return ['data' => ['id' => $refund->id, 'amount_cents' => $refund->amount_cents, 'reason' => $refund->reason, 'refunded_at' => $refund->refunded_at]];
    }
}
