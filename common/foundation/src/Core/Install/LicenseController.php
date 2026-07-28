<?php

namespace Common\Core\Install;

use Common\Core\Demo\BlockedOnDemoSite;
use Common\Settings\DotEnvEditor;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Http;

/**
 * @tags License
 */
#[ExcludeRoutesFromPublicDocs]
class LicenseController extends Controller
{
    public function __construct()
    {
        $this->middleware('isAdmin');
    }

    /**
     * Register purchase code
     *
     * @operationId registerPurchaseCode
     */
    #[BlockedOnDemoSite]
    public function registerPurchaseCode(Request $request)
    {
        $data = $request->validate([
            'purchase_code' => 'required|string',
            'module' => 'string',
        ]);
        $moduleName = $data['module'] ?? null;

        // get envato item ID for specified module or main app
        $envatoItemId = $moduleName
            ? config("modules.$moduleName.envato_item_id")
            : config('app.envato_item_id');
        if (!$envatoItemId) {
            abort(422, 'Could not find envato item ID');
        }

        // register purchase code with vebto support site
        $response = Http::withOptions(['verify' => false])->post(
            'https://support.vebto.com/envato/register-purchase-code',
            [
                'purchase_code' => $data['purchase_code'],
                'item_id' => $envatoItemId,
                'domain' => parse_url(config('app.url'), PHP_URL_HOST),
            ],
        );
        if ($response->failed()) {
            if ($response->status() === 422) {
                return response()->json(
                    [
                        'message' => $response->json('message'),
                        'errors' => $response->json('errors'),
                    ],
                    422,
                );
            } else {
                abort(422, $response->toException()->getMessage());
            }
        }

        $registeredCode = $response->json('purchase_code');
        if (!$registeredCode) {
            abort(422, 'Could not register purchase code. Please try again.');
        }

        // store purchase code in .env file
        $key = 'ENVATO_PURCHASE_CODE';

        if ($moduleName) {
            $key = strtoupper($moduleName) . '_ENVATO_PURCHASE_CODE';
        }

        (new DotEnvEditor())->write([
            $key => $registeredCode,
        ]);

        return response()->json([
            'purchase_code' => $registeredCode,
        ]);
    }
}
