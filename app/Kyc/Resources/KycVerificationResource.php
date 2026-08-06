<?php

namespace App\Kyc\Resources;

use App\Kyc\Models\KycVerification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin KycVerification
 */
class KycVerificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isOwner = $request->user()?->id === $this->user_id;
        $isAdmin = $request->user()?->hasPermission('admin');
        return [
            'id' => $this->id,
            'document_type' => $this->document_type,
            'document_number' => $this->document_number,
            'status' => $this->status,
            'rejection_reason' => $this->rejection_reason,
            'created_at' => $this->created_at,
            'reviewed_at' => $this->reviewed_at,
            'documents' => $this->when(
                $isOwner || $isAdmin,
                fn(): array => $this->documentUrls($isOwner),
            ),
            'user' => $this->whenLoaded('user', fn() => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'image' => $this->user->image,
            ]),
        ];
    }

    private function documentUrls(bool $isOwner): array
    {
        $urls = [];
        foreach ((array) $this->documents as $key => $path) {
            if (!is_string($path)) continue;
            $urls[$key] = $isOwner
                ? url("api/v1/kyc/documents/{$key}")
                : url("api/v1/admin/kyc-verifications/{$this->id}/documents/{$key}");
        }
        return $urls;
    }
}
