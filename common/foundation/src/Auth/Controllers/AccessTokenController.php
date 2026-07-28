<?php

namespace Common\Auth\Controllers;

use Illuminate\Support\Facades\Auth;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * @tags Account
 */
#[ExcludeRoutesFromPublicDocs]
class AccessTokenController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth']);
    }

    /**
     * Create access token.
     *
     * @operationId createAccessToken
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'tokenName' => 'required|string|min:3|max:100',
        ]);

        $token = Auth::user()->createToken($data['tokenName']);

        return response()->json([
            'token' => $token->accessToken,
            'plainTextToken' => $token->plainTextToken,
        ]);
    }

    /**
     * Delete access token.
     *
     * @operationId deleteAccessToken
     */
    public function destroy(int $tokenId)
    {
        Auth::user()->tokens()->where('id', $tokenId)->delete();

        return response()->noContent();
    }
}
