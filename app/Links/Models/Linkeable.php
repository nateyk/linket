<?php

namespace App\Links\Models;

use App\TrackingPixels\Models\TrackingPixel;
use App\Analytics\Actions\LogTrackedEvent;
use Carbon\Carbon;
use Common\Core\AppUrl;
use Common\Core\BaseModel;
use Common\Domains\CustomDomain;
use Exception;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

abstract class Linkeable extends BaseModel
{
    const RENDER_TYPE_REDIRECT = 'redirect';
    const RENDER_TYPE_REDIRECT_WITH_DELAY = 'redirectWithDelay';
    const RENDER_TYPE_FRONTEND = 'frontend';

    abstract public function getRenderType(): string;
    abstract public function loadRelationsForRendering(): void;

    public function getFrontendRenderData(): array
    {
        throw new Exception(
            'Frontend rendering is not supported by ' . static::class,
        );
    }

    public static function findForRendering(string $backHalf): self|null
    {
        return static::query()
            ->where(
                fn(Builder $q) => $q
                    ->forCurrentDomain()
                    ->where('back_half', $backHalf),
            )
            // match link attached to specific domain first
            ->orderBy('domain_id', 'desc')
            ->first();
    }

    public function getFinalDestinationUrl(): string
    {
        $finalDestionationUrl = $this->getDestinationUrlBeforeApplyingMutations();

        if (!settings('links.retargeting')) {
            return $finalDestionationUrl;
        }

        $location = LogTrackedEvent::getLocation();
        $device = LogTrackedEvent::getDevice();
        $platform = LogTrackedEvent::getPlatform();

        // apply the first matching retargeting rule
        $matchedRule = $this->getRetargetingRules()->first(function (
            LinkeableRule $rule,
        ) use ($location, $device, $platform) {
            if ($rule->type === 'geo') {
                return $location === $rule->key;
            } elseif ($rule->type === 'device') {
                return $device === $rule->key;
            } elseif ($rule->type === 'platform') {
                return Str::contains(
                    str_replace(' ', '', $platform),
                    str_replace(' ', '', $rule->key),
                );
            } else {
                return false;
            }
        });
        if ($matchedRule) {
            $finalDestionationUrl = $matchedRule->value;
        }

        // apply utm params
        if ($utm = $this->getDestinationUtmString()) {
            // prefix params with utm_ if needed
            $utm = Str::of($utm)
                ->explode('&')
                ->map(
                    fn($item) => Str::startsWith($item, 'utm_')
                        ? $item
                        : 'utm_' . $item,
                )
                ->implode('&');
            $finalDestionationUrl .=
                (parse_url($finalDestionationUrl, PHP_URL_QUERY) ? '&' : '?') .
                $utm;
        }

        return $finalDestionationUrl;
    }

    protected function hasRedirectDelayingProperties(): bool
    {
        if ($this->getTrackingPixels()->isNotEmpty()) {
            return true;
        }

        return false;
    }

    /**
     * Destination url before applying rules, utm, leap link, etc.
     */
    protected function getDestinationUrlBeforeApplyingMutations(): string
    {
        return $this->long_url;
    }

    /**
     * @return Collection<int, LinkeableRule>
     */
    public function getRetargetingRules(): Collection
    {
        return $this->rules;
    }

    public function getExpirationDate(): ?Carbon
    {
        return $this->expires_at;
    }

    public function getActivationDate(): ?Carbon
    {
        return $this->activates_at;
    }

    public function getDestinationUtmString(): string
    {
        return $this->utm ?? '';
    }

    /**
     * @var Collection<int, TrackingPixel>
     */
    public function getTrackingPixels(): Collection
    {
        return $this->relationLoaded('pixels') ? $this->pixels : collect();
    }

    public function getDomainId(): int|null
    {
        return $this->domain_id;
    }

    public function getDomain(): CustomDomain|null
    {
        return $this->relationLoaded('domain') ? $this->domain : null;
    }

    public function getPassword(): string|null
    {
        return $this->password;
    }

    #[Scope]
    protected function forCurrentDomain(Builder $query): void
    {
        $query->where(function (Builder $builder) {
            $brandedDomain = app(AppUrl::class)->matchedCustomDomain;
            $builder->where(function ($builder) {
                $builder->where('domain_id', 0)->orWhereNull('domain_id');
            });
            if ($brandedDomain) {
                $builder->orWhere('domain_id', $brandedDomain->id);
            }
        });
    }
}
