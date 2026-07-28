<?php

namespace Common\Users\Resources;

use App\Models\User;
use Common\Billing\Subscription;
use Common\Roles\Models\Role;
use Common\Billing\Subscriptions\SubscriptionResource;
use Common\Permissions\Models\Permission;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * @mixin User
 */
#[SchemaName('User')]
class UserResource extends JsonResource
{
    public function toArray($request)
    {
        $email = $this->email;
        $loadAccountSettingsData =
            $request->input('fields_preset') === 'account_settings';

        // redact email on demo site if not the current user
        if (config('app.demo') && $request->user()?->email !== $email) {
            $email = 'hidden@demo.com';
        }

        if ($loadAccountSettingsData) {
            $this->loadDataForAccountSettingsPage();
        }

        if ($request->input('fields_preset') === 'update_user') {
            $this->loadMissing(['roles', 'permissions', 'bans', 'tokens']);
        }

        if ($request->input('fields_preset') === 'users_datatable') {
            $this->loadMissing([
                'roles',
                'subscriptions',
                'bans',
                'latestUserSession',
            ]);
        }

        $this->loadRequestedRelations($request->all());

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $email,
            'image' => $this->image,
            'banned_at' => $this->whenNotNull($this->banned_at),
            'ban_reason' => $this->when(
                $this->relationLoaded('bans'),
                fn() => $this->bans?->first()?->comment,
            ),
            'roles' => $this->whenLoaded(
                'roles',
                fn(Collection $roles) => $roles->map(
                    fn(Role $role) => [
                        'id' => $role->id,
                        'name' => $role->name,
                    ],
                ),
            ),
            'permissions' => $this->whenLoaded(
                'permissions',
                fn(Collection $permissions) => $permissions->map(
                    fn(Permission $permission) => [
                        'id' => $permission->id,
                        'name' => $permission->name,
                        /**
                         * Additional restrictions applied to user for this permission.
                         * @example [['name' => 'count', 'value' => 10]]
                         * @var array<array{name: string, value: string}>
                         */
                        'restrictions' => $permission->restrictions,
                    ],
                ),
            ),

            'subscription' => $this->whenLoaded(
                'subscriptions',
                fn(Collection $subscriptions) => new SubscriptionResource(
                    $subscriptions->first(),
                ),
            ),
            'card_brand' => $this->when(
                $this->relationLoaded('subscriptions'),
                $this->card_brand,
            ),
            'card_last_four' => $this->when(
                $this->relationLoaded('subscriptions'),
                $this->card_last_four,
            ),
            'card_expires' => $this->when(
                $this->relationLoaded('subscriptions'),
                $this->card_expires,
            ),

            'tokens' => $this->whenLoaded(
                'tokens',
                fn(Collection $tokens) => $tokens->map(
                    fn(PersonalAccessToken $token) => [
                        'id' => $token->id,
                        'name' => $token->name,
                        'last_used_at' => $token->last_used_at,
                        'created_at' => $token->created_at,
                    ],
                ),
            ),
            'language' => $this->language,
            'country' => $this->country,
            'timezone' => $this->timezone,
            'social_profiles' => $this->whenLoaded('social_profiles'),
            'two_factor_confirmed_at' => $this->when(
                $loadAccountSettingsData,
                $this->two_factor_confirmed_at,
            ),
            /** @var array<string> */
            'two_factor_recovery_codes' => $this->when(
                $loadAccountSettingsData,
                $this->two_factor_recovery_codes
                    ? $this->recoveryCodes()
                    : null,
            ),
            'email_verified_at' => $this->email_verified_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'latest_user_session' => $this->whenLoaded('latestUserSession'),
            'unread_notifications_count' => $this->whenCounted(
                'unreadNotifications',
            ),
        ];
    }

    protected function loadDataForAccountSettingsPage()
    {
        $this->loadMissing(['roles', 'social_profiles', 'tokens']);

        if (settings('billing.enable')) {
            $this->load([
                'subscriptions' => function ($query) {
                    $query
                        ->with('product', 'price', 'invoices')
                        ->orderBy('updated_at', 'desc')
                        ->get()
                        ->filter(
                            fn(
                                Subscription $subscription,
                            ) => $subscription->valid(),
                        );
                },
            ]);
        }
    }
}
