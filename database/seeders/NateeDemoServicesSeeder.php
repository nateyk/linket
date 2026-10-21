<?php

namespace Database\Seeders;

use App\Biolinks\Models\Biolink;
use App\CreatorServices\Models\CreatorService;
use App\CreatorServices\Models\ServiceCategory;
use App\CreatorServices\Models\ServiceSubcategory;
use Common\Files\FileEntry;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Demo content for the local "natee" storefront. It is safe to run more than
 * once: services are matched by slug and their packages and FAQs are replaced.
 */
class NateeDemoServicesSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->warn('Skipping demo services in production.');

            return;
        }

        $store = Biolink::query()->where('back_half', 'natee')->first();

        if (!$store) {
            $this->command?->warn('Storefront "natee" was not found; demo services were not seeded.');

            return;
        }

        DB::transaction(function () use ($store): void {
            foreach ($this->definitions() as $definition) {
                $this->seedService($store, $definition);
            }
        });

        $this->command?->info('Seeded 3 demo services on /natee.');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function definitions(): array
    {
        return [
            [
                'slug' => 'website-design-development',
                'title' => 'Website Design & Development',
                'category' => 'Programming & Tech',
                'subcategory' => 'Website Development',
                'short_description' => 'Fast, responsive websites that turn visitors into customers.',
                'description' => '<p>Your website should look sharp and do the selling for you. I design and build fast, responsive sites that make it easy for visitors to understand what you offer and take the next step.</p><p><strong>What is included:</strong></p><ul><li>Design tailored to your brand</li><li>Responsive build for phone, tablet and desktop</li><li>On-page SEO and analytics setup</li><li>Contact forms and booking links</li><li>A walkthrough so you can update the site yourself</li></ul><p>Tell me what you need and I will recommend the package that fits.</p>',
                'skills' => ['Web Design', 'Laravel', 'React', 'SEO'],
                'cover_file_entry_id' => 35,
                'packages' => [
                    [
                        'name' => 'Landing Page',
                        'description' => 'One focused page for a campaign, launch or service.',
                        'price_cents' => 49900,
                        'delivery_days' => 7,
                        'revisions' => 2,
                        'features' => ['One-page design', 'Mobile responsive', 'Contact form', 'Basic SEO'],
                    ],
                    [
                        'name' => 'Business Website',
                        'description' => 'A complete site for a growing business or studio.',
                        'price_cents' => 89900,
                        'delivery_days' => 14,
                        'revisions' => 3,
                        'features' => ['Up to 5 pages', 'CMS setup', 'Analytics', 'Speed optimization'],
                    ],
                    [
                        'name' => 'Online Store',
                        'description' => 'A storefront with products, checkout and payments.',
                        'price_cents' => 149900,
                        'delivery_days' => 21,
                        'revisions' => 4,
                        'features' => ['Product catalog', 'Checkout integration', 'Payment setup', 'Training call'],
                    ],
                ],
                'faqs' => [
                    [
                        'question' => 'How long does a website take?',
                        'answer' => 'A landing page takes about a week. A full business site or store usually takes two to three weeks after we agree on the scope.',
                    ],
                    [
                        'question' => 'Do I need to provide content?',
                        'answer' => 'You can send copy and images, or I can write and source them as part of the project.',
                    ],
                    [
                        'question' => 'Will the site work on phones?',
                        'answer' => 'Yes. Every page is designed and tested on phones, tablets and desktop.',
                    ],
                ],
            ],
            [
                'slug' => 'social-media-management',
                'title' => 'Social Media Management',
                'category' => 'Digital Marketing',
                'subcategory' => 'Social Media Management',
                'short_description' => 'Consistent content and community management for growing brands.',
                'description' => '<p>Showing up consistently is the hardest part of social media. I plan, design and publish content for your brand so your feed stays active while you focus on the work.</p><p><strong>Every plan includes:</strong></p><ul><li>A monthly content calendar</li><li>Graphics and short-form video</li><li>Captions, hashtags and scheduling</li><li>Community management</li><li>A monthly performance report</li></ul><p>Pick the plan that matches your posting rhythm; we can adjust it as you grow.</p>',
                'skills' => ['Social Media', 'Content Strategy', 'Copywriting', 'Analytics'],
                'cover_file_entry_id' => 34,
                'packages' => [
                    [
                        'name' => 'Starter',
                        'description' => 'A steady presence on one platform.',
                        'price_cents' => 29900,
                        'delivery_days' => 7,
                        'revisions' => 2,
                        'features' => ['1 platform', '8 posts per month', 'Captions and hashtags', 'Monthly report'],
                    ],
                    [
                        'name' => 'Growth',
                        'description' => 'More content and a second channel.',
                        'price_cents' => 59900,
                        'delivery_days' => 14,
                        'revisions' => 4,
                        'features' => ['2 platforms', '16 posts per month', 'Short-form video', 'Community management', 'Monthly report'],
                    ],
                    [
                        'name' => 'Full Management',
                        'description' => 'A complete social presence, handled end to end.',
                        'price_cents' => 99900,
                        'delivery_days' => 30,
                        'revisions' => 6,
                        'features' => ['3 platforms', '24 posts per month', 'Short-form video', 'Community management', 'Monthly strategy call'],
                    ],
                ],
                'faqs' => [
                    [
                        'question' => 'Which platforms do you manage?',
                        'answer' => 'Instagram, Facebook, LinkedIn, TikTok and X. We pick the channels that fit your audience.',
                    ],
                    [
                        'question' => 'Do you create the content?',
                        'answer' => 'Yes. Graphics, captions and short-form video are included in every plan.',
                    ],
                    [
                        'question' => 'Can I cancel anytime?',
                        'answer' => 'Yes. Plans run month to month with no long contract.',
                    ],
                ],
            ],
            [
                'slug' => 'custom-illustration-pack',
                'title' => 'Custom Illustration Pack',
                'category' => 'Graphics & Design',
                'subcategory' => 'Illustration',
                'short_description' => 'Hand-drawn illustrations tailored to your brand and story.',
                'description' => '<p>Original illustrations make a brand feel unmistakably yours. I draw custom artwork for packaging, editorial, social media and product interfaces, matching the style and palette you already use.</p><p><strong>What you get:</strong></p><ul><li>A sketch before the final artwork</li><li>Clean, layered illustrations</li><li>PNG, JPG and SVG exports</li><li>Commercial usage rights</li></ul><p>Because every illustration is scoped by hand, packages are quoted after we talk through the brief.</p>',
                'skills' => ['Illustration', 'Character Design', 'Procreate', 'Brand Art'],
                'cover_file_entry_id' => 9,
                'packages' => [
                    [
                        'name' => 'Single Illustration',
                        'description' => 'One custom piece for a campaign or product.',
                        'price_cents' => null,
                        'delivery_days' => 5,
                        'revisions' => 2,
                        'features' => ['1 illustration', 'Sketch approval', 'PNG and JPG exports'],
                    ],
                    [
                        'name' => 'Mini Pack',
                        'description' => 'A small set of illustrations with a shared style.',
                        'price_cents' => null,
                        'delivery_days' => 10,
                        'revisions' => 3,
                        'features' => ['5 illustrations', 'Sketch approval', 'PNG, JPG and SVG exports'],
                    ],
                    [
                        'name' => 'Brand Pack',
                        'description' => 'A full illustration system for your brand.',
                        'price_cents' => null,
                        'delivery_days' => 21,
                        'revisions' => 4,
                        'features' => ['12 illustrations', 'Sketch approval', 'All file formats', 'Commercial usage rights'],
                    ],
                ],
                'faqs' => [
                    [
                        'question' => 'What files will I receive?',
                        'answer' => 'High-resolution PNG, JPG and SVG files, plus the layered source where the tool allows it.',
                    ],
                    [
                        'question' => 'Can I use the illustrations commercially?',
                        'answer' => 'Yes. You get full commercial rights for the final artwork.',
                    ],
                    [
                        'question' => 'How many revisions are included?',
                        'answer' => 'Two rounds on a single piece, three on a pack and four on a brand pack.',
                    ],
                ],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $definition
     */
    private function seedService(Biolink $store, array $definition): void
    {
        // Slugs are unique across the whole app. Never take over another
        // creator's service, even if it happens to use the same slug.
        $service = CreatorService::withTrashed()->firstOrNew([
            'slug' => $definition['slug'],
        ]);

        if ($service->exists && $service->store_id !== $store->id) {
            $this->command?->warn("Skipping {$definition['slug']}: the slug belongs to another storefront.");

            return;
        }

        $category = ServiceCategory::query()
            ->where('slug', Str::slug($definition['category']))
            ->first();
        $subcategory = $category
            ? ServiceSubcategory::query()
                ->where('service_category_id', $category->id)
                ->where('slug', Str::slug($definition['subcategory'] ?? ''))
                ->first()
            : null;

        $service->fill([
            'workspace_id' => $store->workspace_id,
            'user_id' => $store->user_id,
            'store_id' => $store->id,
            'title' => $definition['title'],
            'short_description' => $definition['short_description'],
            'description' => $definition['description'],
            'category' => $category?->name ?? $definition['category'],
            'service_category_id' => $category?->id,
            'service_subcategory_id' => $subcategory?->id,
            'skills' => $definition['skills'],
            'cover_file_entry_id' => $this->fileEntryId($definition['cover_file_entry_id']),
            'contact_channels' => $this->contactChannels(),
            'currency' => 'ETB',
            'status' => 'published',
            'deleted_at' => null,
        ]);
        $service->save();

        $service->packages()->delete();

        foreach ($definition['packages'] as $position => $package) {
            $service->packages()->create([
                'name' => $package['name'],
                'description' => $package['description'] ?? null,
                'price_cents' => $package['price_cents'],
                'currency' => 'ETB',
                'delivery_days' => $package['delivery_days'] ?? null,
                'revisions' => $package['revisions'] ?? null,
                'features' => $package['features'] ?? [],
                'position' => $position,
            ]);
        }

        $service->faqs()->delete();

        foreach ($definition['faqs'] as $position => $faq) {
            $service->faqs()->create([
                'question' => $faq['question'],
                'answer' => $faq['answer'],
                'position' => $position,
            ]);
        }
    }

    /**
     * The demo media already uploaded to the natee workspace. If the file is
     * missing (a fresh database), the card simply shows its placeholder.
     */
    private function fileEntryId(int $id): ?int
    {
        return FileEntry::query()->find($id)?->id;
    }

    /**
     * @return array<int, array{type: string, label: string, value: string}>
     */
    private function contactChannels(): array
    {
        return [
            ['type' => 'whatsapp', 'label' => 'WhatsApp', 'value' => '+251911234567'],
            ['type' => 'telegram', 'label' => 'Telegram', 'value' => 'studio'],
            ['type' => 'email', 'label' => 'Email', 'value' => 'admin@admin.com'],
        ];
    }
}
