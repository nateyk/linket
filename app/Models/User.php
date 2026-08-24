<?php

namespace App\Models;

use App\Biolinks\Models\Biolink;
use App\Folders\Models\Folder;
use App\Kyc\Models\KycVerification;
use App\LinkOverlays\Models\LinkOverlay;
use App\LinkPages\Models\LinkPage;
use App\Links\Models\Link;
use App\QrCodes\Models\QrCode;
use App\Stores\Models\Store;
use Common\Auth\Models\BaseUser;
use Common\Domains\CustomDomain;
use Common\Workspaces\Models\Workspace;
use App\TrackingPixels\Models\TrackingPixel;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Laravel\Sanctum\HasApiTokens;

class User extends BaseUser
{
    use HasFactory, HasApiTokens;

    public function workspaces(): HasMany
    {
        return $this->hasMany(Workspace::class, 'owner_id');
    }

    public function links(): HasMany
    {
        return $this->hasMany(Link::class);
    }

    public function biolinks(): HasMany
    {
        return $this->hasMany(Biolink::class);
    }

    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }

    public function linkOverlays(): HasMany
    {
        return $this->hasMany(LinkOverlay::class);
    }

    public function folders(): HasMany
    {
        return $this->hasMany(Folder::class);
    }

    public function trackingPixels(): HasMany
    {
        return $this->hasMany(TrackingPixel::class);
    }

    public function linkPages(): HasMany
    {
        return $this->hasMany(LinkPage::class);
    }

    public function qrCodes(): HasMany
    {
        return $this->hasMany(QrCode::class);
    }

    public function customDomains(): HasMany
    {
        return $this->hasMany(CustomDomain::class);
    }

    public function kycVerifications(): HasMany
    {
        return $this->hasMany(KycVerification::class);
    }

    public function latestKycVerification(): HasOne
    {
        return $this->hasOne(KycVerification::class)->latestOfMany();
    }

    public function isKycVerified(): bool
    {
        return $this->kyc_status === KycVerification::STATUS_APPROVED;
    }

    public function isKycPending(): bool
    {
        return $this->kyc_status === KycVerification::STATUS_PENDING;
    }

    public function isKycRejected(): bool
    {
        return $this->kyc_status === KycVerification::STATUS_REJECTED;
    }

    public function isKycRequired(): bool
    {
        return settings('kyc.enabled', false) && !$this->isKycVerified();
    }

    protected static function newFactory()
    {
        return UserFactory::new();
    }
}
