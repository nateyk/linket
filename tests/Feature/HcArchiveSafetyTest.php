<?php

namespace Tests\Feature;

use App\HelpCenter\Actions\ExportHelpCenter;
use App\HelpCenter\Actions\ImportHelpCenter;
use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;
use ZipArchive;

class HcArchiveSafetyTest extends TestCase
{
    use DatabaseTransactions;

    private array $temporaryFiles = [];

    protected function tearDown(): void
    {
        foreach ($this->temporaryFiles as $path) {
            @unlink($path);
        }

        parent::tearDown();
    }

    public function test_invalid_zip_preserves_existing_content(): void
    {
        [$category, $article] = $this->seedContent();
        $path = tempnam(sys_get_temp_dir(), 'hc-invalid-');
        $this->temporaryFiles[] = $path;
        file_put_contents($path, 'not a zip archive');

        $this->assertImportIsRejected($path);
        $this->assertExistingContent($category, $article);
    }

    public function test_missing_manifest_preserves_existing_content(): void
    {
        [$category, $article] = $this->seedContent();
        $this->assertImportIsRejected($this->archive(null));
        $this->assertExistingContent($category, $article);
    }

    public function test_invalid_manifest_preserves_existing_content(): void
    {
        [$category, $article] = $this->seedContent();
        $this->assertImportIsRejected($this->archive('{"categories":[]}'));
        $this->assertExistingContent($category, $article);
    }

    public function test_empty_archive_cannot_silently_erase_help_center(): void
    {
        [$category, $article] = $this->seedContent();
        $this->assertImportIsRejected($this->archive('[]'));
        $this->assertExistingContent($category, $article);
    }

    public function test_unsafe_archive_entry_is_rejected_before_deletion(): void
    {
        [$category, $article] = $this->seedContent();
        $zip = $this->archive(json_encode($this->replacementManifest()));
        $this->appendFile($zip, '../bad.png', 'not-a-real-image');

        $this->assertImportIsRejected($zip);
        $this->assertExistingContent($category, $article);
    }

    public function test_missing_image_is_rejected_before_deletion(): void
    {
        [$category, $article] = $this->seedContent();
        $zip = $this->archive(
            json_encode($this->replacementManifest()),
            json_encode([
                'entries' => [[
                    'id' => 2,
                    'file_name' => 'image.png',
                    'public' => true,
                    'disk_prefix' => 'uploads',
                ]],
                'article_entries' => ['9002' => [2]],
                'category_entries' => [],
            ]),
        );

        $this->assertImportIsRejected($zip);
        $this->assertExistingContent($category, $article);
    }

    public function test_database_error_rolls_back_the_replacement(): void
    {
        [$category, $article] = $this->seedContent();
        $manifest = $this->replacementManifest();
        $manifest[0]['sections'][0]['articles'][0]['title'] = str_repeat('X', 400);

        try {
            (new ImportHelpCenter())->execute($this->archive(json_encode($manifest)));
            $this->fail('Database should reject an oversized article title.');
        } catch (\Illuminate\Database\QueryException) {
            // The importer must roll back all article and category deletions.
        }

        $this->assertExistingContent($category, $article);
        $this->assertDatabaseMissing('categories', ['id' => 9000]);
    }

    public function test_export_uses_unique_valid_zip_archives(): void
    {
        [$category, $article] = $this->seedContent();

        $first = (new ExportHelpCenter())->execute();
        $second = (new ExportHelpCenter())->execute();
        array_push($this->temporaryFiles, $first, $second);

        $this->assertNotSame($first, $second);
        $this->assertFileExists($first);
        $this->assertFileExists($second);

        $zip = new ZipArchive();
        $this->assertTrue($zip->open($first) === true);
        $data = json_decode($zip->getFromName('help-center.json'), true);
        $zip->close();

        $this->assertIsArray($data);
        $this->assertContains($category->name, collect($data)->pluck('name')->all());
        $this->assertStringContainsString(
            $article->title,
            json_encode($data),
        );
    }

    private function assertImportIsRejected(string $path): void
    {
        try {
            (new ImportHelpCenter())->execute($path);
            $this->fail('An invalid archive must be rejected.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('file', $e->errors());
        }
    }

    private function assertExistingContent(HcCategory $category, HcArticle $article): void
    {
        $this->assertDatabaseHas('categories', ['id' => $category->id]);
        $this->assertDatabaseHas('articles', ['id' => $article->id]);
    }

    private function archive(?string $manifest, ?string $fileEntries = null): string
    {
        $path = tempnam(sys_get_temp_dir(), 'hc-test-');
        $this->temporaryFiles[] = $path;
        $zip = new ZipArchive();
        $this->assertTrue($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true);

        if ($manifest !== null) {
            $zip->addFromString('help-center.json', $manifest);
        }
        if ($fileEntries !== null) {
            $zip->addFromString('file-entries.json', $fileEntries);
        }
        $this->assertTrue($zip->close());

        return $path;
    }

    private function appendFile(string $path, string $name, string $contents): void
    {
        $zip = new ZipArchive();
        $this->assertTrue($zip->open($path) === true);
        $zip->addFromString($name, $contents);
        $this->assertTrue($zip->close());
    }

    private function replacementManifest(): array
    {
        return [[
            'id' => 9000,
            'name' => 'Replacement help root',
            'sections' => [[
                'id' => 9001,
                'name' => 'Replacement section',
                'articles' => [[
                    'id' => 9002,
                    'title' => 'Replacement article',
                    'body' => '<p>Replacement body</p>',
                    'draft' => false,
                    'tags' => [],
                ]],
            ]],
        ]];
    }

    private function seedContent(): array
    {
        $category = HcCategory::query()->create([
            'name' => 'Original help '.Str::random(8),
            'position' => 1,
        ]);
        $section = HcCategory::query()->create([
            'name' => 'Original section '.Str::random(8),
            'position' => 1,
            'parent_id' => $category->id,
        ]);
        $article = HcArticle::query()->create([
            'title' => 'Original article '.Str::random(8),
            'slug' => Str::random(8),
            'body' => '<p>Original help body</p>',
            'draft' => false,
        ]);
        $article->categories()->attach([
            $category->id => ['position' => 1],
            $section->id => ['position' => 1],
        ]);

        return [$category, $article];
    }
}
