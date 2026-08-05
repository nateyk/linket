<?php

namespace App\Biolinks\Requests;

use App\Biolinks\Models\Biolink;
use Common\Files\FileEntry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;

class UpdateCreatorProfileRequest extends FormRequest
{
    private const SOCIAL_TYPES = [
        'mail',
        'facebook',
        'twitter',
        'instagram',
        'tiktok',
        'youtube',
        'soundcloud',
        'bandcamp',
        'linkedin',
        'whatsapp',
        'telegram',
        'twitch',
        'patreon',
        'pinterest',
        'spotify',
        'amazon',
        'snapchat',
        'apple',
    ];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'display_name' => ['required', 'string', 'max:80'],
            'profile_title' => ['nullable', 'string', 'max:120'],
            'bio' => ['nullable', 'string', 'max:600'],
            'avatar_url' => ['nullable', 'string', 'max:2048', $this->profileImageRule(...)],
            'cover_url' => ['nullable', 'string', 'max:2048', $this->profileImageRule(...)],
            'available_for_work' => ['required', 'boolean'],
            'skills' => ['present', 'array', 'max:8'],
            'skills.*' => ['required', 'string', 'max:32', 'distinct:ignore_case'],
            'follow_url' => ['nullable', 'url:http,https', 'max:2048'],
            'contact_url' => ['nullable', 'string', 'max:2048', $this->contactRule(...)],
            'social_links' => ['present', 'array:' . implode(',', self::SOCIAL_TYPES)],
            'social_links.*' => ['nullable', 'string', 'max:2048'],
            'featured_product_ids' => ['present', 'array', 'max:6'],
            'featured_product_ids.*' => ['integer', 'distinct'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'skills' => collect($this->input('skills', []))
                ->filter(fn(mixed $skill): bool => is_string($skill))
                ->map(fn(string $skill): string => trim($skill))
                ->filter()
                ->values()
                ->all(),
            'social_links' => collect($this->input('social_links', []))
                ->only(self::SOCIAL_TYPES)
                ->filter(fn(mixed $url): bool => is_string($url) && trim($url) !== '')
                ->map(fn(string $url): string => trim($url))
                ->all(),
        ]);
    }

    private function contactRule(string $attribute, mixed $value, \Closure $fail): void
    {
        if (
            filter_var($value, FILTER_VALIDATE_EMAIL) === false &&
            filter_var($value, FILTER_VALIDATE_URL) === false
        ) {
            $fail(__('The contact destination must be a valid email address or URL.'));
        }
    }

    private function profileImageRule(
        string $attribute,
        mixed $value,
        \Closure $fail,
    ): void {
        if (!is_string($value)) {
            $fail(__('The :attribute format is invalid.'));

            return;
        }

        $scheme = Str::lower((string) parse_url($value, PHP_URL_SCHEME));
        if (
            in_array($scheme, ['http', 'https'], true) &&
            filter_var($value, FILTER_VALIDATE_URL) !== false
        ) {
            return;
        }

        $path = ltrim($value, '/');
        if (
            $scheme !== '' ||
            !Str::startsWith($path, 'storage/') ||
            Str::contains($path, ['..', '\\', "\0", '?', '#'])
        ) {
            $fail(__('The :attribute must be a valid uploaded image.'));

            return;
        }

        $biolink = Biolink::query()
            ->select(['id', 'workspace_id'])
            ->find((int) $this->route('id'));
        $user = $this->user();

        $isOwnedImage = $biolink && $user && FileEntry::query()
            ->where('file_name', basename($path))
            ->where('owner_id', $user->id)
            ->where('workspace_id', $biolink->workspace_id)
            ->where('upload_type', 'linkImages')
            ->where('public', true)
            ->where('type', 'image')
            ->where('mime', 'like', 'image/%')
            ->exists();

        if (!$isOwnedImage) {
            $fail(__('The :attribute must be a valid uploaded image.'));
        }
    }
}
