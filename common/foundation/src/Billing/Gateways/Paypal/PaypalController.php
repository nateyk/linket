<?php

namespace Common\Billing\Gateways\Paypal;

use Common\Billing\Gateways\Paypal\Paypal;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;

/**
 * @tags Paypal
 */
#[ExcludeRoutesFromPublicDocs]
class PaypalController extends Controller
{
    public function __construct(protected Paypal $paypal)
    {
        $this->middleware('auth');
    }

    /**
     * Store subscription details locally.
     *
     * @operationId storePaypalSubscriptionDetailsLocally
     */
    public function storeSubscriptionDetailsLocally(Request $request)
    {
        $data = $request->validate([
            'paypal_subscription_id' => 'required|string',
        ]);

        $this->paypal->subscriptions->sync(
            $data['paypal_subscription_id'],
            Auth::id(),
        );

        return response()->noContent();
    }
}
