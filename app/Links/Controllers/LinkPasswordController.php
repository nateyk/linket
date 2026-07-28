<?php

namespace App\Links\Controllers;

use Common\API\ExcludeRoutesFromPublicDocs;
use Common\Auth\Validators\PasswordIsValid;
use Dedoc\Scramble\Attributes\Parameter;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * @tags Links
 */
#[ExcludeRoutesFromPublicDocs]
class LinkPasswordController extends Controller
{
    /**
     * Validate link password.
     *
     * Check if given password for link is valid.
     *
     * @operationId validateLinkPassword
     */
    #[Parameter('body', 'password', type: 'string', required: true)]
    public function __invoke(Request $request)
    {
        $data = $request->validate([
            'linkeableType' => 'required|string',
            'linkeableId' => 'required|int',
        ]);

        $namespace = modelTypeToNamespace($data['linkeableType']);
        $model = app($namespace)->find($data['linkeableId']);

        $request->validate([
            'password' => ['required', new PasswordIsValid($model->password)],
        ]);

        return response()->json(['matches' => true]);
    }
}
