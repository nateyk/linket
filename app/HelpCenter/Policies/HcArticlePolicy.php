<?php namespace App\HelpCenter\Policies;

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use App\HelpCenter\Visibility\HcVisibility;
use App\Models\User;
use Common\Core\Policies\BasePolicy;

class HcArticlePolicy extends BasePolicy
{
    public function index(?User $user)
    {
        return $this->hasPermission($user, 'articles.update') ||
            $this->hasPermission($user, 'articles.view');
    }

    public function show(?User $user, HcArticle|HcCategory $resource)
    {
        if (! $this->index($user)) {
            return false;
        }

        if ($user?->isAgent()) {
            return true;
        }

        if (! HcVisibility::canViewRole($user, $resource->visible_to_role)) {
            return false;
        }

        if ($resource instanceof HcCategory) {
            if (! $resource->parent_id) {
                return true;
            }

            // The compact parent relation omits visible_to_role, so load the
            // actual parent rather than authorizing against a null attribute.
            $parent = HcCategory::query()->find($resource->parent_id);

            return $parent && HcVisibility::canViewRole($user, $parent->visible_to_role);
        }

        if ($resource->draft) {
            return false;
        }

        return HcArticle::query()
            ->whereKey($resource->getKey())
            ->hasVisiblePlacement()
            ->exists();
    }

    public function store(User $user)
    {
        return $this->hasPermission($user, 'articles.create') ||
            $this->hasPermission($user, 'articles.update');
    }

    public function update(
        User $user,
        HcArticle|HcCategory|null $articleOrCategory = null,
    ) {
        return $this->hasPermission($user, 'articles.update') ||
            ($articleOrCategory &&
                $user->roles
                    ->pluck('id')
                    ->contains($articleOrCategory->managed_by_role));
    }

    public function destroy(User $user)
    {
        return $this->hasPermission($user, 'articles.update') ||
            $this->hasPermission($user, 'articles.delete');
    }
}
