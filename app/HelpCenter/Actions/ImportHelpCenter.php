<?php

namespace App\HelpCenter\Actions;

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use Common\Files\FileEntry;
use Common\Search\ImportRecordsIntoScout;
use Common\Tags\Tag;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use ZipArchive;

class ImportHelpCenter
{
    public function execute(string $path): void
    {
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            throw ValidationException::withMessages([
                'file' => 'The uploaded file is not a valid ZIP archive.',
            ]);
        }

        try {
            // Finish every archive check before changing any existing content.
            $manifest = (new ValidateHelpCenterArchive())->execute($zip);

            HcArticle::disableSearchSyncing();
            try {
                DB::transaction(function () use ($manifest, $zip) {
                    $this->replaceHelpCenter($manifest['categories']);
                    $this->storeHcImages($zip, $manifest['files']);
                });
            } finally {
                HcArticle::enableSearchSyncing();
            }

            // Search changes run only after the replacement has committed.
            try {
                Artisan::call('scout:flush '.HcArticle::class);
            } catch (\Throwable $e) {
                report($e);
            }
            (new ImportRecordsIntoScout())->execute(HcArticle::class);
        } finally {
            $zip->close();
        }
    }

    protected function replaceHelpCenter(array $categories): void
    {
        $articleIds = DB::table('articles')->pluck('id')->all();
        $categoryIds = DB::table('categories')->pluck('id')->all();

        // The import will flush and rebuild the complete Scout index once
        // the replacement commits. Do not remove entries mid-import.
        (new DeleteMultipleArticles())->execute($articleIds, syncSearchIndex: false);

        // DELETE participates in the surrounding transaction; TRUNCATE does not
        // on MySQL. Remove old category relations before deleting categories.
        DB::table('category_article')->delete();
        DB::table('taggables')
            ->where('taggable_type', HcCategory::MODEL_TYPE)
            ->whereIn('taggable_id', $categoryIds)
            ->delete();
        DB::table('file_entry_models')
            ->where('model_type', HcCategory::MODEL_TYPE)
            ->whereIn('model_id', $categoryIds)
            ->delete();
        DB::table('categories')->delete();

        Model::unguarded(function () use ($categories) {
            foreach ($categories as $categoryData) {
                $this->importCategory($categoryData);
            }
        });
    }

    protected function importCategory(array $data): void
    {
        $category = HcCategory::create([
            ...Arr::except($data, [
                'sections', 'model_type', 'is_section', 'hidden',
            ]),
            'created_at' => $data['created_at'] ?? now(),
            'updated_at' => $data['updated_at'] ?? now(),
        ]);

        foreach ($data['sections'] as $sectionData) {
            $section = HcCategory::create([
                ...Arr::except($sectionData, [
                    'articles', 'model_type', 'is_section', 'hidden',
                ]),
                'parent_id' => $category->id,
                'created_at' => $sectionData['created_at'] ?? now(),
                'updated_at' => $sectionData['updated_at'] ?? now(),
            ]);

            foreach ($sectionData['articles'] as $articleData) {
                $this->importArticle($articleData, $category, $section);
            }
        }
    }

    protected function importArticle(
        array $data,
        HcCategory $category,
        HcCategory $section,
    ): void {
        $attributes = Arr::except($data, [
            'tags', 'model_type', 'article_id', 'category_id',
            'position', 'extra_data',
        ]);

        $article = HcArticle::firstOrCreate(
            ['id' => $data['id']],
            [
                ...$attributes,
                'created_at' => $data['created_at'] ?? now(),
                'updated_at' => $data['updated_at'] ?? now(),
                'author_id' => $data['author_id'] ?? Auth::id(),
            ],
        );

        $article->categories()->syncWithoutDetaching([
            $section->id, $category->id,
        ]);

        foreach ($data['tags'] as $tagData) {
            $tag = Tag::firstOrCreate(['name' => $tagData['name']]);
            $article->tags()->syncWithoutDetaching([$tag->id]);
        }
    }

    protected function storeHcImages(ZipArchive $zip, array $manifest): void
    {
        foreach ($manifest['article_entries'] as $articleId => $entryIds) {
            $article = HcArticle::findOrFail($articleId);
            foreach ($entryIds as $entryId) {
                $entry = $this->restoreImageEntry($zip, $entryId, $manifest['entries']);
                $article->inlineImages()->syncWithoutDetaching([$entry->id]);
            }
        }

        foreach ($manifest['category_entries'] as $categoryId => $entryIds) {
            $category = HcCategory::findOrFail($categoryId);
            foreach ($entryIds as $entryId) {
                $entry = $this->restoreImageEntry($zip, $entryId, $manifest['entries']);
                $category->images()->syncWithoutDetaching([$entry->id]);
            }
        }
    }

    protected function restoreImageEntry(ZipArchive $zip, mixed $reference, array $entries): FileEntry
    {
        $data = is_array($reference)
            ? $reference
            : collect($entries)->firstWhere('id', $reference);

        $entry = FileEntry::firstOrCreate(
            ['file_name' => $data['file_name']],
            Arr::except($data, ['id', 'url', 'hash']),
        );

        // Older exporters use the full storage path inside the ZIP, not merely
        // the file name. Accept both layouts without extracting unsafe paths.
        $contents = $zip->getFromName('images/'.trim($entry->getStoragePath(), '/'));
        if ($contents === false) {
            $contents = $zip->getFromName('images/'.$entry->file_name);
        }

        if ($contents === false || ! $entry->getDisk()->put($entry->getStoragePath(), $contents)) {
            throw new RuntimeException('Could not restore an image from the Help Center archive.');
        }

        return $entry;
    }
}
