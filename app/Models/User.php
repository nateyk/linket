<?php

namespace App\Models;

use App\Attributes\Models\CustomAttribute;
use App\Attributes\Traits\HasCustomAttributes;
use App\Biolinks\Models\Biolink;
use App\CannedReplies\Models\CannedReply;
use App\Contacts\Models\PageVisit;
use App\Contacts\Models\UserDetails;
use App\Contacts\Traits\CanHaveSecondaryEmails;
use App\Conversations\Models\Conversation;
use App\Core\Modules;
use App\Folders\Models\Folder;
use App\Kyc\Models\KycVerification;
use App\LinkOverlays\Models\LinkOverlay;
use App\LinkPages\Models\LinkPage;
use App\Links\Models\Link;
use App\QrCodes\Models\QrCode;
use App\Storefront\Models\CreatorPaymentMethod;
use App\Stores\Models\Store;
use App\Team\Traits\CanBeAgent;
use App\TrackingPixels\Models\TrackingPixel;
use App\Telegram\Models\TelegramConnection;
use Common\Auth\Models\BaseUser;
use Common\Domains\CustomDomain;
use Common\Tags\Tag;
use Common\Workspaces\Models\Workspace;
use Database\Factories\UserFactory;
use Envato\Models\PurchaseCode;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphToMany;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Laravel\Sanctum\HasApiTokens;

class User extends BaseUser
{
    use HasFactory,
        HasApiTokens,
        CanBeAgent,
        CanHaveSecondaryEmails,
        HasCustomAttributes {
            updateCustomAttributes as parentUpdateAttributes;
        }

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

    public function creatorPaymentMethods(): HasMany
    {
        return $this->hasMany(CreatorPaymentMethod::class);
    }

    public function telegramConnection(): HasOne
    {
        return $this->hasOne(TelegramConnection::class);
    }

    public function routeNotificationForTelegram(mixed $notification = null): int|string|null
    {
        if (
            ! config('services.telegram.enabled') ||
            blank(config('services.telegram.token'))
        ) {
            return null;
        }

        return $this->telegramConnection()->value('telegram_chat_id');
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

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    public function pageVisits(): HasMany
    {
        return $this->hasMany(PageVisit::class);
    }

    public function latestPageVisit(): HasOne
    {
        return $this->hasOne(PageVisit::class)->orderBy('created_at', 'desc');
    }

    public function details(): HasOne
    {
        return $this->hasOne(UserDetails::class);
    }

    public function purchaseCodes(): HasMany
    {
        return $this->hasMany(PurchaseCode::class)->orderBy('id', 'desc');
    }

    public function cannedReplies(): HasMany
    {
        return $this->hasMany(CannedReply::class);
    }

    public function tags(): MorphToMany
    {
        return $this->morphToMany(Tag::class, 'taggable');
    }

    public function updateCustomAttributes(
        array|Collection $values,
        $permission = CustomAttribute::PERMISSION_USER_CAN_EDIT,
    ): void {
        $email = Arr::pull($values, 'email');
        if ($email) {
            $this->secondaryEmails()->updateOrCreate(['address' => $email]);
        }

        $this->parentUpdateAttributes($values, $permission);
    }

    public function makeSearchableUsing(Collection $models)
    {
        return parent::makeSearchableUsing($models)
            ->load(
                Arr::whereNotNull([
                    Modules::envatoInstalled() ? 'purchaseCodes' : null,
                    'customAttributes' => fn ($builder) => $builder->where(
                        'type',
                        'user',
                    ),
                ]),
            )
            ->loadCount('pageVisits');
    }

    protected function makeAllSearchableUsing($query)
    {
        return parent::makeAllSearchableUsing($query)->with(
            Arr::whereNotNull([
                Modules::envatoInstalled() ? 'purchaseCodes' : null,
                'customAttributes' => fn ($builder) => $builder->where(
                    'type',
                    'user',
                ),
            ]),
        );
    }

    protected static function newFactory()
    {
        return UserFactory::new();
    }
}
