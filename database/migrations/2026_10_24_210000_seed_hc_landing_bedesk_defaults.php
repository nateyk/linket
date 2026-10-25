<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;

return new class extends Migration {
    public function up(): void
    {
        $current = settings('hcLanding') ?? [];

        if (! empty($current['content']['variant'])) {
            return;
        }

        settings()->save([
            'hcLanding' => [
                'header' => [
                    'variant' => 'colorful',
                    'title' => 'How can we help you?',
                    'subtitle' => 'Ask Questions. Browse Articles. Find Answers.',
                    'placeholder' => 'Enter your question or keyword here',
                ],
                'content' => [
                    'variant' => 'articleGrid',
                ],
                'articles_per_category' => 5,
                'children_per_category' => 6,
                'hide_small_categories' => false,
                'show_footer' => false,
            ],
        ]);

        Cache::forget('settings.public');
    }

    public function down(): void
    {
        // Intentionally leave hcLanding in place; admins may have edited it.
    }
};
