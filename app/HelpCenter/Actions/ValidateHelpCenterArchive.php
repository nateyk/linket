<?php

namespace App\HelpCenter\Actions;

use Illuminate\Validation\ValidationException;
use ZipArchive;

/**
 * Check the whole archive before the destructive replacement starts.
 * A missing image or malformed JSON must never wipe existing help content.
 */
class ValidateHelpCenterArchive
{
    public function execute(ZipArchive $zip): array
    {
        $this->validateZipEntries($zip);
        $categories = $this->decodeManifest($zip, 'help-center.json');

        if (! is_array($categories) || ! array_is_list($categories) || count($categories) === 0) {
            $this->reject('The archive must contain a non-empty list of categories.');
        }

        foreach ($categories as $category) {
            $this->validateCategory($category);
        }

        $files = $zip->locateName('file-entries.json') === false
            ? ['entries' => [], 'article_entries' => [], 'category_entries' => []]
            : $this->decodeManifest($zip, 'file-entries.json');

        $this->validateImages($zip, $files);

        return ['categories' => $categories, 'files' => $files];
    }

    protected function validateZipEntries(ZipArchive $zip): void
    {
        $total = 0;

        if ($zip->numFiles > 10000) {
            $this->reject('The archive contains too many files.');
        }

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $name = $stat['name'] ?? '';
            $size = $stat['size'] ?? 0;
            $total += $size;

            if ($name === '' || str_contains($name, '..') || str_contains($name, '\\') || str_starts_with($name, '/')) {
                $this->reject('The archive contains an unsafe file path.');
            }
            if ($size > 25 * 1024 * 1024 || $total > 250 * 1024 * 1024) {
                $this->reject('The archive exceeds the Help Center import size limit.');
            }
        }
    }

    protected function decodeManifest(ZipArchive $zip, string $name): mixed
    {
        $content = $zip->getFromName($name);
        if (! is_string($content)) {
            $this->reject("The archive is missing $name.");
        }

        try {
            return json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            $this->reject("$name contains invalid JSON.");
        }
    }

    protected function validateCategory(mixed $category): void
    {
        $this->requireItem($category, ['id', 'name', 'sections']);

        if (! is_array($category['sections']) || ! array_is_list($category['sections'])) {
            $this->reject('A Help Center category has invalid sections.');
        }

        foreach ($category['sections'] as $section) {
            $this->requireItem($section, ['id', 'name', 'articles']);
            if (! is_array($section['articles']) || ! array_is_list($section['articles'])) {
                $this->reject('A Help Center section has invalid articles.');
            }

            foreach ($section['articles'] as $article) {
                $this->requireItem($article, ['id', 'title', 'body', 'tags']);
                if (! is_string($article['body']) || ! is_array($article['tags'])) {
                    $this->reject('A Help Center article has invalid content or tags.');
                }
                foreach ($article['tags'] as $tag) {
                    if (! is_array($tag) || ! is_string($tag['name'] ?? null)) {
                        $this->reject('A Help Center article contains an invalid tag.');
                    }
                }
            }
        }
    }

    protected function requireItem(mixed $item, array $fields): void
    {
        if (! is_array($item)) {
            $this->reject('The archive has an invalid Help Center record.');
        }

        foreach ($fields as $field) {
            if (! array_key_exists($field, $item)) {
                $this->reject("A Help Center record is missing $field.");
            }
        }

        if (! is_numeric($item['id']) || (int) $item['id'] < 1) {
            $this->reject('A Help Center record has an invalid ID.');
        }

        $name = $item['name'] ?? $item['title'] ?? null;
        if (! is_string($name) || trim($name) === '') {
            $this->reject('A Help Center record must have a name or title.');
        }
    }

    protected function validateImages(ZipArchive $zip, mixed $files): void
    {
        if (! is_array($files)) {
            $this->reject('The image manifest is invalid.');
        }

        foreach (['entries', 'article_entries', 'category_entries'] as $key) {
            if (! is_array($files[$key] ?? null)) {
                $this->reject("The image manifest is missing $key.");
            }
        }

        foreach (['article_entries', 'category_entries'] as $group) {
            foreach ($files[$group] as $refs) {
                if (! is_array($refs)) {
                    $this->reject('The image manifest has invalid references.');
                }
                foreach ($refs as $ref) {
                    $entry = is_array($ref)
                        ? $ref
                        : collect($files['entries'])->firstWhere('id', $ref);
                    $this->validateImageEntry($zip, $entry);
                }
            }
        }
    }

    protected function validateImageEntry(ZipArchive $zip, mixed $entry): void
    {
        $filename = $entry['file_name'] ?? null;
        if (! is_string($filename) || $filename === '' || basename($filename) !== $filename) {
            $this->reject('An image contains an unsafe file name.');
        }

        $prefix = $entry['public'] ?? false
            ? trim((string) ($entry['disk_prefix'] ?? ''), '/').'/'.$filename
            : $filename.'/'.$filename;

        if (str_contains($prefix, '..') || str_contains($prefix, '\\')) {
            $this->reject('An image contains an unsafe storage path.');
        }

        if ($zip->locateName('images/'.$prefix) === false && $zip->locateName('images/'.$filename) === false) {
            $this->reject("The archive is missing image $filename.");
        }
    }

    protected function reject(string $message): never
    {
        throw ValidationException::withMessages(['file' => $message]);
    }
}
