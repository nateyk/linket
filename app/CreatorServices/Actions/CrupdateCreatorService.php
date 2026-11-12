<?php

namespace App\CreatorServices\Actions;

use App\CreatorServices\Models\CreatorService;
use App\CreatorServices\Models\ServiceCategory;
use App\Models\User;
use App\Storefront\Actions\SanitizeProductDescription;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CrupdateCreatorService
{
    public function execute(array $data, User $creator, ?CreatorService $service = null): CreatorService
    {
        $workspaceId = ActiveWorkspace::get()->id;
        $channels = array_key_exists('contact_channels', $data)
            ? $this->normalizeContactChannels($data['contact_channels'] ?? [])
            : null;

        return DB::transaction(function () use ($data, $creator, $service, $workspaceId, $channels): CreatorService {
            $attributes = [
                'workspace_id' => $workspaceId,
                'user_id' => $creator->id,
                'store_id' => $data['store_id'],
                'title' => $data['title'],
                'short_description' => array_key_exists('short_description', $data)
                    ? $data['short_description']
                    : $service?->short_description,
                'description' => array_key_exists('description', $data)
                    ? app(SanitizeProductDescription::class)->execute($data['description'])
                    : $service?->description,
                'category' => $this->categoryName($data, $service),
                'service_category_id' => array_key_exists('service_category_id', $data)
                    ? $data['service_category_id']
                    : $service?->service_category_id,
                'service_subcategory_id' => array_key_exists('service_subcategory_id', $data)
                    ? $data['service_subcategory_id']
                    : $service?->service_subcategory_id,
                'skills' => array_key_exists('skills', $data)
                    ? array_values(array_filter($data['skills'] ?? [], fn ($skill): bool => trim((string) $skill) !== ''))
                    : ($service?->skills ?? []),
                'cover_file_entry_id' => array_key_exists('cover_file_entry_id', $data)
                    ? $data['cover_file_entry_id']
                    : $service?->cover_file_entry_id,
                'video_url' => array_key_exists('video_url', $data)
                    ? $data['video_url']
                    : $service?->video_url,
                'live_demo_url' => array_key_exists('live_demo_url', $data)
                    ? $data['live_demo_url']
                    : $service?->live_demo_url,
                'contact_channels' => $channels ?? $service?->contact_channels ?? [],
                'buyer_questions' => array_key_exists('buyer_questions', $data)
                    ? array_map(fn (string $question): string => trim($question), array_values($data['buyer_questions'] ?? []))
                    : ($service?->buyer_questions ?? []),
                'status' => $data['status'] ?? $service?->status ?? 'draft',
                'currency' => $service?->currency ?? 'ETB',
            ];

            if ($service) {
                $service->update($attributes);
            } else {
                $attributes['slug'] = $this->uniqueSlug($data['title']);
                $service = CreatorService::query()->create($attributes);
            }

            if (array_key_exists('packages', $data)) {
                $this->syncPackages($service, $data['packages'] ?? []);
            }
            if (array_key_exists('faqs', $data)) {
                $this->syncFaqs($service, $data['faqs'] ?? []);
            }
            if (array_key_exists('gallery_file_entry_ids', $data)) {
                $this->syncImages($service, $data['gallery_file_entry_ids'] ?? []);
            }

            return $service->fresh()->load(['store.domain', 'cover', 'images.file', 'packages', 'faqs']);
        });
    }

    private function categoryName(array $data, ?CreatorService $service): ?string
    {
        if (!empty($data['service_category_id'])) {
            return ServiceCategory::query()
                ->whereKey($data['service_category_id'])
                ->value('name');
        }

        return array_key_exists('category', $data)
            ? $data['category']
            : $service?->category;
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::slug($title) ?: 'service';
        $slug = $base;
        $suffix = 2;

        while (CreatorService::query()->withTrashed()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    /**
     * @param  array<int, array<string, mixed>>  $packages
     */
    private function syncPackages(CreatorService $service, array $packages): void
    {
        $keptIds = [];

        foreach (array_values($packages) as $position => $row) {
            $attributes = [
                'name' => $row['name'],
                'description' => $row['description'] ?? null,
                'price_cents' => $row['price_cents'] ?? null,
                'currency' => 'ETB',
                'delivery_days' => $row['delivery_days'] ?? null,
                'revisions' => $row['revisions'] ?? null,
                'features' => array_values(array_filter(
                    $row['features'] ?? [],
                    fn ($feature): bool => trim((string) $feature) !== '',
                )),
                'position' => $position,
            ];

            $existing = !empty($row['id'])
                ? $service->packages()->whereKey($row['id'])->first()
                : null;

            if ($existing) {
                $existing->update($attributes);
                $keptIds[] = $existing->id;
            } else {
                $keptIds[] = $service->packages()->create($attributes)->id;
            }
        }

        $service->packages()->whereNotIn('id', $keptIds)->delete();
    }

    /**
     * @param  array<int, array<string, mixed>>  $faqs
     */
    private function syncFaqs(CreatorService $service, array $faqs): void
    {
        $service->faqs()->delete();

        foreach (array_values($faqs) as $position => $row) {
            $service->faqs()->create([
                'question' => $row['question'],
                'answer' => $row['answer'],
                'position' => $position,
            ]);
        }
    }

    /**
     * @param  array<int, int>  $fileIds
     */
    private function syncImages(CreatorService $service, array $fileIds): void
    {
        $service->images()->delete();

        foreach (array_values(array_unique($fileIds)) as $position => $fileId) {
            $service->images()->create([
                'file_entry_id' => $fileId,
                'position' => $position,
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $channels
     * @return array<int, array{type: string, label: string, value: string}>
     */
    private function normalizeContactChannels(array $channels): array
    {
        $normalized = [];

        foreach (array_values($channels) as $index => $channel) {
            $type = (string) ($channel['type'] ?? '');
            $value = trim((string) ($channel['value'] ?? ''));

            if ($value === '') {
                continue;
            }

            $value = match ($type) {
                'whatsapp', 'phone' => preg_replace('/[^0-9+]/', '', $value) ?? '',
                'telegram' => ltrim($value, '@'),
                default => $value,
            };

            $valid = match ($type) {
                'whatsapp', 'phone' => strlen(ltrim($value, '+')) >= 6,
                'telegram' => $value !== '',
                'email' => filter_var($value, FILTER_VALIDATE_EMAIL) !== false,
                'link' => filter_var($value, FILTER_VALIDATE_URL) !== false
                    && in_array(parse_url($value, PHP_URL_SCHEME), ['http', 'https'], true),
                default => false,
            };

            if (!$valid) {
                throw ValidationException::withMessages([
                    "contact_channels.{$index}.value" => __('Enter a valid contact value.'),
                ]);
            }

            $normalized[] = [
                'type' => $type,
                'label' => trim((string) ($channel['label'] ?? '')),
                'value' => $value,
            ];
        }

        return $normalized;
    }
}
