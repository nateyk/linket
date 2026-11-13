<?php

namespace App\HelpCenter\Actions;

use App\HelpCenter\Models\HcArticle;
use Illuminate\Validation\ValidationException;

class PerformArticleBatchAction
{
    public function execute(array $articleIds, string $action, array $data): void
    {
        $attribute = match ($action) {
            'changeArticleStatus' => 'draft',
            'changeVisibility' => 'visible_to_role',
            default => throw ValidationException::withMessages([
                'action' => 'Unknown Help Center batch action.',
            ]),
        };

        $value = match ($action) {
            'changeArticleStatus' => $data['status'] !== 'published',
            'changeVisibility' => $data['roleId'] ?? null,
        };

        // Eloquent mass updates skip the saved/updated events that Laravel
        // Scout uses to refresh search documents. Save real models instead.
        HcArticle::query()
            ->whereKey($articleIds)
            ->orderBy('id')
            ->chunkById(100, function ($articles) use ($attribute, $value) {
                foreach ($articles as $article) {
                    $article->{$attribute} = $value;

                    if ($article->isDirty($attribute)) {
                        $article->save();
                    }
                }
            });
    }
}
