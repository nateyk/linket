<?php

namespace App\Links\Actions;

use App\Links\Exceptions\LinkRedirectFailed;
use App\Analytics\Actions\GetMonthlyClicks;
use App\Biolinks\Models\Biolink;
use App\Links\Models\Link;
use App\Links\Models\LinkeableRule;
use App\Folders\Models\Folder;
use App\Links\Models\Linkeable;
use App\QrCodes\Models\QrCode;
use App\Notifications\ClickQuotaExhausted;
use Common\Core\AppUrl;
use Common\Domains\CustomDomain;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Notifications\DatabaseNotification;
use Symfony\Component\Mailer\Exception\TransportException;

class LinkeablePublicPolicy
{
    private string $modelName;

    public function __construct(protected AppUrl $appUrl) {}

    public function isAccessible(Linkeable $model): bool
    {
        $this->modelName = match ($model::MODEL_TYPE) {
            Link::MODEL_TYPE => 'Short link',
            Biolink::MODEL_TYPE => 'Link in bio',
            Folder::MODEL_TYPE => 'Folder',
            QrCode::MODEL_TYPE => 'QR code',
        };

        return $this->isValidDomain($model) &&
            !$this->pastExpirationDateOrClicks($model) &&
            !$this->overClickQuota($model) &&
            !$this->isDisabled($model) &&
            !$model->user?->isBanned();
    }

    public static function linkeableExpired(Linkeable $model): bool
    {
        return $model->getExpirationDate() &&
            $model->getExpirationDate()->lessThan(now());
    }

    public static function linkeableWillActivateLater(Linkeable $model): bool
    {
        return $model->getActivationDate() &&
            $model->getActivationDate()->isAfter(now());
    }

    private function pastExpirationDateOrClicks(Linkeable $model): bool
    {
        if (static::linkeableExpired($model)) {
            $expirationDate = $model->getExpirationDate();
            throw (new LinkRedirectFailed(
                "$this->modelName is past its expiration date ($expirationDate)",
            ))->setModel($model);
        }

        if (static::linkeableWillActivateLater($model)) {
            $activationDate = $model->getActivationDate();
            throw (new LinkRedirectFailed(
                "$this->modelName is set to activate on ($activationDate)",
            ))->setModel($model);
        }

        $expClicksRule = $model
            ->getRetargetingRules()
            ->first(function (LinkeableRule $rule) {
                return $rule->type === 'exp_clicks';
            });
        if (
            $expClicksRule &&
            (int) $expClicksRule->key <= $model->clicks_count
        ) {
            $msg = "$this->modelName is past it's specified expiration clicks ($expClicksRule->key).";
            if ($expClicksRule->value) {
                $msg .= " Visits to this $this->modelName will redirect to '$expClicksRule->value'.";
            }

            throw (new LinkRedirectFailed($msg))
                ->setModel($model)
                ->setRedirectUrl($expClicksRule->value);
        }

        return false;
    }

    private function isValidDomain(Linkeable $model): bool
    {
        $defaultHost =
            settings('custom_domains.default_host') ?:
            $this->appUrl->originalAppUrl;
        $defaultHost = $this->appUrl->getHostFrom($defaultHost);
        $requestHost = $this->appUrl->getRequestHost();

        // link should only be accessible via single domain
        if ($model->getDomainId() > 0) {
            $domain = CustomDomain::forUser($model->user_id)->find(
                $model->getDomainId(),
            );
            if (!$domain || !$this->appUrl->requestHostMatches($domain->host)) {
                throw (new LinkRedirectFailed(
                    "$this->modelName is set to only be accessible via '$domain?->host', but request domain is '$requestHost'",
                ))->setModel($model);
            }
        }

        // link should be accessible via default domain only
        elseif ($model->getDomainId() === 0) {
            if (!$this->appUrl->requestHostMatches($defaultHost)) {
                throw (new LinkRedirectFailed(
                    "$this->modelName is set to only be accessible via '$defaultHost' (default domain), but request domain is '$requestHost'",
                ))->setModel($model);
            }
        }

        // link should be accessible via default and all user connected domains
        else {
            if ($this->appUrl->requestHostMatches($defaultHost, true)) {
                return true;
            }
            $domains = CustomDomain::forUser($model->user_id)->get();
            $customDomainMatches = $domains->contains(function (
                CustomDomain $domain,
            ) {
                return $this->appUrl->requestHostMatches($domain->host);
            });
            if (!$customDomainMatches) {
                throw (new LinkRedirectFailed(
                    "Current domain '$requestHost' does not match default domain or any custom domains connected by user.",
                ))->setModel($model);
            }
        }

        return true;
    }

    private function overClickQuota(Linkeable $model): bool
    {
        if (
            $model->workspace_id &&
            ($workspace = ActiveWorkspace::get(
                $model->workspace_id,
                createIfNotFound: false,
            ))
        ) {
            $quota = $workspace
                ->getOwnerUser()
                ->getRestrictionValue('links.create', 'click_count');
            $totalClicks = (new GetMonthlyClicks())->forWorkspace($workspace);
            $ownerUser = $workspace->getOwnerUser();
        } else {
            $quota = ($model->user ?? app('guestRole'))->getRestrictionValue(
                'links.create',
                'click_count',
            );
            $totalClicks = $model->user
                ? (new GetMonthlyClicks())->forUser($model->user)
                : (new GetMonthlyClicks())->forLinkeable($model);
            $ownerUser = $model->user;
        }

        if (is_null($quota)) {
            return false;
        }

        if ($quota < $totalClicks) {
            $alreadyNotifiedThisMonth = app(DatabaseNotification::class)
                ->where('type', ClickQuotaExhausted::class)
                ->whereBetween('created_at', [
                    now()->startOfMonth(),
                    now()->endOfMonth(),
                ])
                ->exists();
            if (!$alreadyNotifiedThisMonth && $ownerUser) {
                try {
                    $ownerUser->notify(new ClickQuotaExhausted());
                } catch (TransportException $e) {
                    //
                }
            }
            throw (new LinkRedirectFailed(
                "User this $this->modelName belongs to is over their click quota for the month.",
            ))->setModel($model);
        }

        return false;
    }

    private function isDisabled(Linkeable $model): bool
    {
        if ($model->trashed()) {
            throw (new LinkRedirectFailed(
                "This $this->modelName is archived and will not redirect user to destination url.",
            ))->setModel($model);
        }

        return false;
    }
}
