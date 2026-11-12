<?php

namespace App\HelpCenter\Actions;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use ZipArchive;

/**
 * Verify the entire backup before a destructive Help Center replacement.
 */
class ValidateHelpCenterArchive
{
    public function execute(ZipArchive $zip): array
    {
        $this->validateZipEntries($zip);
        $categories = $this->decodeManifest($zip, 'help-center.json');
        $this->validateCategories($categories);

        $files = $zip->locateName('file-entries.json') === false
            ? ['entries' => [], 'article_entries' => [], 'category_entries' => []]
            : $this->decodeManifest($zip, 'file-entries.json');

        $this->validateImages($zip, $files);

        return ['categories' => $categories, 'files' => $files];
    }

    protected function validateZipEntries(ZipArchive $zip): void
    {
        $totalBytes = 0;
        if ($zip->numFiles > 10000) {
            $this->reject('The ZIP archive has too many files.');
        }

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            $name = $stat['name'] ?? '';
            $size = $stat['size'] ?? 0;
            $totalBytes += $size;

            if ($name === '' || str_contains($name, '..')) {
                $this->reject('The ZIP archive has an unsafe file name.');
            }
            if (str_contains($name, '\\') || str_starts_with($name, '/')) {
                $this->reject('The ZIP archive has an unsafe file path.');
            }
            if ($size > 25 * 1024 * 1024 || $totalBytes > 250 * 1024 * 1024) {
                $this->reject('The ZIP archive exceeds the allowed size.');
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

    protected function validateCategories(mixed $categories): void
    {
        $rules = [
            'categories' => 'required|array|min:1',
            'categories.*.id' => 'required|integer|min:1',
            'categories.*.name' => 'required|string',
            'categories.*.sections' => 'present|array',
            'categories.*.sections.*.id' => 'required|integer|min:1',
            'categories.*.sections.*.name' => 'required|string',
            'categories.*.sections.*.articles' => 'present|array',
            'categories.*.sections.*.articles.*.id' => 'required|integer|min:1',
            'categories.*.sections.*.articles.*.title' => 'required|string',
            'categories.*.sections.*.articles.*.body' => 'present|string',
            'categories.*.sections.*.articles.*.tags' => 'present|array',
            'categories.*.sections.*.articles.*.tags.*.name' => 'required|string',
        ];
        $validator = Validator::make(['categories' => $categories], $rules);
        if ($validator->fails()) {
            $this->reject('Invalid Help Center archive: '.$validator->errors()->first());
        }
    }

    protected function validateImages(ZipArchive $zip, mixed $files): void
    {
        $validator = Validator::make(['files' => $files], [
            'files' => 'required|array',
            'files.entries' => 'required|array',
            'files.article_entries' => 'required|array',
            'files.category_entries' => 'required|array',
        ]);

        if ($validator->fails()) {
            $this->reject('The image manifest is invalid.');
        }

        $groups = array_merge(
            array_values($files['article_entries']),
            array_values($files['category_entries']),
        );

        foreach ($groups as $refs) {
            $this->validateImageReferences($zip, $refs, $files['entries']);
        }
    }

    protected function validateImageReferences(ZipArchive $zip, mixed $refs, array $entries): void
    {
        if (! is_array($refs)) {
            $this->reject('The image manifest has invalid references.');
        }

        foreach ($refs as $ref) {
            $entry = is_array($ref)
                ? $ref
                : collect($entries)->firstWhere('id', $ref);
            $this->validateImageEntry($zip, $entry);
        }
    }

    protected function validateImageEntry(ZipArchive $zip, mixed $entry): void
    {
        $name = is_array($entry) ? ($entry['file_name'] ?? null) : null;
        if (! is_string($name) || $name === '') {
            $this->reject('An image is missing its file name.');
        }
        if (basename($name) !== $name) {
            $this->reject('An image contains an unsafe file name.');
        }

        $path = ($entry['public'] ?? false)
            ? trim((string) ($entry['disk_prefix'] ?? ''), '/').'/'.$name
            : $name.'/'.$name;

        if (str_contains($path, '..') || str_contains($path, '\\')) {
            $this->reject('An image contains an unsafe storage path.');
        }
        if ($zip->locateName('images/'.$path) === false &&
            $zip->locateName('images/'.$name) === false) {
            $this->reject("The archive is missing image $name.");
        }
    }

    protected function reject(string $message): never
    {
        throw ValidationException::withMessages(['file' => $message]);
    }
}
