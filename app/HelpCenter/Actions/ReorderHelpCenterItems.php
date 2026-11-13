<?php

namespace App\HelpCenter\Actions;

use App\HelpCenter\Models\HcCategory;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReorderHelpCenterItems
{
    public function categories(array $ids, ?int $parentId): void
    {
        DB::transaction(function () use ($ids, $parentId) {
            $query = DB::table('categories')->where('parent_id', $parentId);
            $currentIds = $query->lockForUpdate()->pluck('id')->all();
            $this->requireExactSet($currentIds, $ids);

            foreach ($ids as $index => $id) {
                DB::table('categories')
                    ->where('id', $id)
                    ->where('parent_id', $parentId)
                    ->update(['position' => $index + 1]);
            }
        });
    }

    public function articles(array $ids, int $sectionId): void
    {
        HcCategory::whereNotNull('parent_id')->findOrFail($sectionId);

        DB::transaction(function () use ($ids, $sectionId) {
            $query = DB::table('category_article')
                ->where('category_id', $sectionId);
            $currentIds = $query->lockForUpdate()->pluck('article_id')->all();
            $this->requireExactSet($currentIds, $ids);

            foreach ($ids as $index => $id) {
                DB::table('category_article')
                    ->where('category_id', $sectionId)
                    ->where('article_id', $id)
                    ->update(['position' => $index + 1]);
            }
        });
    }

    private function requireExactSet(array $existing, array $provided): void
    {
        $existing = array_map('intval', $existing);
        $provided = array_map('intval', $provided);
        sort($existing);
        sort($provided);

        if ($existing !== $provided) {
            throw ValidationException::withMessages([
                'ids' => 'Reorder must include each item in this section exactly once.',
            ]);
        }
    }
}
