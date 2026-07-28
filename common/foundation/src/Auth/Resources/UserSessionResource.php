<?php

namespace Common\Auth\Resources;

use Common\Auth\Models\UserSession;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin UserSession
 */
#[SchemaName('UserSession')]
class UserSessionResource extends JsonResource
{
    public function toArray(Request $request)
    {
        $isCurrentDevice = requestIsFromFrontend()
            ? $this->resource->session_id === $request->session()->getId()
            : $this->resource->token ===
                $request->user()->currentAccessToken()->token;

        return [
            'id' => $this->id,
            'country' => $this->country,
            'city' => $this->city,
            'platform' => $this->platform,
            'device' => $this->device,
            'browser' => $this->browser,
            'ip_address' => $this->ip_address,
            'is_current_device' => $isCurrentDevice,
            'updated_at' => $this->updated_at,
        ];
    }
}
