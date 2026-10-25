<?php

namespace Common\Core\Install;

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class CreateDefaultHelpCenter
{
    public function execute(): void
    {
        if (
            ! Schema::hasTable('articles') ||
            ! Schema::hasTable('categories') ||
            HcArticle::query()->exists()
        ) {
            return;
        }

        foreach ($this->categories() as $index => $category) {
            $parent = HcCategory::firstOrCreate(
                ['name' => $category['name'], 'parent_id' => null],
                [
                    'description' => null,
                    'position' => $index,
                ],
            );

            $section = HcCategory::firstOrCreate(
                [
                    'name' => $category['name'] . ' articles',
                    'parent_id' => $parent->id,
                ],
                [
                    'description' => null,
                    'position' => 0,
                ],
            );

            foreach ($category['articles'] as $articleIndex => $article) {
                $hcArticle = HcArticle::firstOrCreate(
                    ['slug' => $article['slug']],
                    [
                        'title' => $article['title'],
                        'body' => $this->body($article['slug']),
                        'draft' => false,
                        'views' => $article['views'],
                    ],
                );

                $section->articles()->syncWithoutDetaching([
                    $hcArticle->id => ['position' => $articleIndex],
                ]);
            }
        }
    }

    protected function body(string $slug): string
    {
        $path = app('path.common') . "/resources/defaults/help/{$slug}.html";
        if (! is_file($path)) {
            return '<p>' . e(Str::headline($slug)) . '</p>';
        }

        return $this->replacePlaceholders((string) file_get_contents($path));
    }

    protected function replacePlaceholders(string $text): string
    {
        return str_replace(
            '[Website Name]',
            config('app.name'),
            $text,
        );
    }

    protected function categories(): array
    {
        return [
            [
                'name' => 'Getting Started',
                'articles' => [
                    [
                        'slug' => 'creating-your-first-short-link',
                        'title' => 'Creating your first short link',
                        'views' => 900,
                    ],
                    [
                        'slug' => 'setting-up-your-link-in-bio-page',
                        'title' => 'Setting up your link-in-bio page',
                        'views' => 700,
                    ],
                    [
                        'slug' => 'inviting-teammates-to-your-workspace',
                        'title' => 'Inviting teammates to your workspace',
                        'views' => 300,
                    ],
                ],
            ],
            [
                'name' => 'Links & Analytics',
                'articles' => [
                    [
                        'slug' => 'understanding-your-click-analytics',
                        'title' => 'Understanding your click analytics',
                        'views' => 800,
                    ],
                    [
                        'slug' => 'adding-tracking-pixels',
                        'title' => 'Adding tracking pixels',
                        'views' => 350,
                    ],
                    [
                        'slug' => 'creating-cta-overlays',
                        'title' => 'Creating CTA overlays',
                        'views' => 250,
                    ],
                ],
            ],
            [
                'name' => 'Custom Domains',
                'articles' => [
                    [
                        'slug' => 'connecting-a-custom-domain',
                        'title' => 'Connecting a custom domain',
                        'views' => 750,
                    ],
                    [
                        'slug' => 'dns-records-explained',
                        'title' => 'DNS records explained',
                        'views' => 400,
                    ],
                    [
                        'slug' => 'troubleshooting-domain-verification',
                        'title' => 'Troubleshooting domain verification',
                        'views' => 300,
                    ],
                ],
            ],
            [
                'name' => 'Billing & Plans',
                'articles' => [
                    [
                        'slug' => 'managing-your-subscription',
                        'title' => 'Managing your subscription',
                        'views' => 450,
                    ],
                    [
                        'slug' => 'upgrading-or-downgrading-your-plan',
                        'title' => 'Upgrading or downgrading your plan',
                        'views' => 200,
                    ],
                ],
            ],
        ];
    }
}
