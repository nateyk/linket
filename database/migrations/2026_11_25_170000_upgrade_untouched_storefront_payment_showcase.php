<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $row = DB::table('settings')->where('name', 'landingPage')->first();
        if (! $row) return;

        $page = json_decode($row->value, true);
        if (! is_array($page['sections'] ?? null)) return;

        $legacy = $this->readJson('defaults/creator-showcase-pre-migration.json');
        $preset = $this->readJson('defaults/creator-homepage.json');
        $newSections = $this->replaceStockSections($page['sections'], $legacy, $preset);
        if ($newSections === $page['sections']) return;

        $page['sections'] = $newSections;
        DB::table('settings')->where('name', 'landingPage')->update([
            'value' => json_encode($page, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ]);
    }

    private function readJson(string $relativePath): array
    {
        return json_decode(file_get_contents(resource_path($relativePath)), true);
    }

    private function replaceStockSections(array $sections, array $legacy, array $preset): array
    {
        return array_map(
            fn ($section) => $this->replaceSection($section, $legacy, $preset),
            $sections,
        );
    }

    private function replaceSection(mixed $section, array $legacy, array $preset): mixed
    {
        if ($section == $legacy['store']) return $preset['sections'][2];
        if ($section == $legacy['payment']) return $preset['sections'][4];

        return $section;
    }

    public function down(): void
    {
        // Never overwrite edits to published storefront and payment messaging.
    }
};
