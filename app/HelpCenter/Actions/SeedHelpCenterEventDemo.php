<?php

namespace App\HelpCenter\Actions;

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use Illuminate\Support\Str;

/**
 * Event / creator-support themed HC content for agent demo (idempotent).
 */
class SeedHelpCenterEventDemo
{
    public function execute(): void
    {
        $groups = [
            [
                'name' => 'Events & ticketing',
                'sections' => [
                    [
                        'name' => 'For attendees',
                        'articles' => [
                            [
                                'title' => 'Finding your ticket confirmation',
                                'slug' => 'finding-ticket-confirmation',
                            ],
                            [
                                'title' => 'Requesting a refund for an event',
                                'slug' => 'event-refund-request',
                            ],
                        ],
                    ],
                    [
                        'name' => 'For organizers',
                        'articles' => [
                            [
                                'title' => 'Publishing events on your bio page',
                                'slug' => 'publish-events-bio-page',
                            ],
                            [
                                'title' => 'Managing attendee support tickets',
                                'slug' => 'manage-attendee-support-tickets',
                            ],
                        ],
                    ],
                ],
            ],
            [
                'name' => 'Creator store support',
                'sections' => [
                    [
                        'name' => 'Buyers',
                        'articles' => [
                            [
                                'title' => 'Contacting a creator about an order',
                                'slug' => 'contact-creator-about-order',
                            ],
                        ],
                    ],
                    [
                        'name' => 'Creators',
                        'articles' => [
                            [
                                'title' => 'Using your creator support inbox',
                                'slug' => 'creator-support-inbox',
                            ],
                        ],
                    ],
                ],
            ],
        ];

        foreach ($groups as $groupIndex => $group) {
            $category = HcCategory::firstOrCreate(
                ['name' => $group['name'], 'parent_id' => null],
                ['description' => null, 'position' => 100 + $groupIndex],
            );

            foreach ($group['sections'] as $sectionIndex => $sectionData) {
                $section = HcCategory::firstOrCreate(
                    [
                        'name' => $sectionData['name'],
                        'parent_id' => $category->id,
                    ],
                    ['description' => null, 'position' => $sectionIndex],
                );

                foreach ($sectionData['articles'] as $articleIndex => $articleData) {
                    $article = HcArticle::firstOrCreate(
                        ['slug' => $articleData['slug']],
                        [
                            'title' => $articleData['title'],
                            'body' => $this->demoBody($articleData['title']),
                            'draft' => false,
                            'views' => 0,
                        ],
                    );

                    $section->articles()->syncWithoutDetaching([
                        $article->id => ['position' => $articleIndex],
                    ]);
                }
            }
        }
    }

    protected function demoBody(string $title): string
    {
        $safe = e($title);

        return <<<HTML
<p>This is demo Help Center content for <strong>{$safe}</strong>.</p>
<p>Edit this article in <a href="/agent/hc/articles">All articles</a> or arrange it under <a href="/agent/hc/arrange">Structure</a>.</p>
HTML;
    }
}
