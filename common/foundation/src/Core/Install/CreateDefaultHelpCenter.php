<?php

namespace Common\Core\Install;

use Common\Help\Models\HelpArticle;
use Common\Help\Models\HelpCategory;

class CreateDefaultHelpCenter
{
    public function execute(): void
    {
        if (HelpArticle::query()->exists()) {
            return;
        }

        foreach ($this->categories() as $index => $category) {
            $helpCategory = HelpCategory::firstOrCreate(
                ['slug' => $category['slug']],
                [
                    'name' => $category['name'],
                    'views' => $category['views'],
                    'sort_id' => $index,
                ],
            );

            foreach ($category['articles'] as $article) {
                HelpArticle::firstOrCreate(
                    ['slug' => $article['slug']],
                    [
                        'title' => $article['title'],
                        'short_description' => $article['short_description'],
                        'body' => $this->body($article['slug']),
                        'views' => $article['views'],
                        'help_category_id' => $helpCategory->id,
                    ],
                );
            }
        }
    }

    protected function body(string $slug): string
    {
        return $this->replacePlaceholders(
            file_get_contents(
                app('path.common') . "/resources/defaults/help/{$slug}.html",
            ),
        );
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
                'slug' => 'getting-started',
                'views' => 500,
                'articles' => [
                    [
                        'slug' => 'creating-your-first-short-link',
                        'title' => 'Creating your first short link',
                        'short_description' =>
                            'Create a short link in seconds, customize its back-half, and share it anywhere. A perfect tour of your first five minutes with Linket.',
                        'views' => 900,
                    ],
                    [
                        'slug' => 'setting-up-your-link-in-bio-page',
                        'title' => 'Setting up your link-in-bio page',
                        'short_description' =>
                            'Build a mobile-friendly landing page that collects all of your links behind a single URL you can put in any bio.',
                        'views' => 700,
                    ],
                    [
                        'slug' => 'inviting-teammates-to-your-workspace',
                        'title' => 'Inviting teammates to your workspace',
                        'short_description' =>
                            'Share a workspace with teammates or clients so everyone can create, organize, and track links together.',
                        'views' => 300,
                    ],
                ],
            ],
            [
                'name' => 'Links & Analytics',
                'slug' => 'links-analytics',
                'views' => 400,
                'articles' => [
                    [
                        'slug' => 'understanding-your-click-analytics',
                        'title' => 'Understanding your click analytics',
                        'short_description' =>
                            'Read your link analytics with confidence: clicks over time, referrers, countries, devices, and what each number means.',
                        'views' => 800,
                    ],
                    [
                        'slug' => 'adding-tracking-pixels',
                        'title' => 'Adding tracking pixels',
                        'short_description' =>
                            'Fire Facebook, Google, and other advertising pixels on link clicks to keep your ad attribution accurate.',
                        'views' => 350,
                    ],
                    [
                        'slug' => 'creating-cta-overlays',
                        'title' => 'Creating CTA overlays',
                        'short_description' =>
                            'Promote a product or announcement on top of any destination page with a lightweight call-to-action overlay.',
                        'views' => 250,
                    ],
                ],
            ],
            [
                'name' => 'Custom Domains',
                'slug' => 'custom-domains',
                'views' => 350,
                'articles' => [
                    [
                        'slug' => 'connecting-a-custom-domain',
                        'title' => 'Connecting a custom domain',
                        'short_description' =>
                            'Serve short links from your own brand instead of ours. Connect a domain, point its DNS, and go live in a few minutes.',
                        'views' => 750,
                    ],
                    [
                        'slug' => 'dns-records-explained',
                        'title' => 'DNS records explained',
                        'short_description' =>
                            'What CNAME, A, and TXT records actually do, and exactly which values your domain registrar expects from you.',
                        'views' => 400,
                    ],
                    [
                        'slug' => 'troubleshooting-domain-verification',
                        'title' => 'Troubleshooting domain verification',
                        'short_description' =>
                            'Domain stuck on "pending"? The most common causes of failed verification and how to fix each one.',
                        'views' => 300,
                    ],
                ],
            ],
            [
                'name' => 'Billing & Plans',
                'slug' => 'billing-plans',
                'views' => 200,
                'articles' => [
                    [
                        'slug' => 'managing-your-subscription',
                        'title' => 'Managing your subscription',
                        'short_description' =>
                            'Change your plan, update your payment method, or download invoices from your billing settings at any time.',
                        'views' => 450,
                    ],
                    [
                        'slug' => 'upgrading-or-downgrading-your-plan',
                        'title' => 'Upgrading or downgrading your plan',
                        'short_description' =>
                            'Switch between monthly and yearly billing and what happens to your links and data when your plan changes.',
                        'views' => 200,
                    ],
                ],
            ],
        ];
    }
}
