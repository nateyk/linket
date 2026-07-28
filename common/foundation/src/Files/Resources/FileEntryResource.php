<?php

namespace Common\Files\Resources;

use Common\Files\FileEntry;
use Dedoc\Scramble\Attributes\SchemaName;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin FileEntry
 */
#[SchemaName('FileEntry')]
class FileEntryResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'file_name' => $this->file_name,
            'mime' => $this->mime,
            'url' => $this->url,
            'hash' => $this->hash,
            'extension' => $this->extension,
            'type' => $this->type,
            'public' => $this->public,
            'file_size' => $this->file_size,
            'created_at' => $this->created_at,
            'thumbnail' => $this->thumbnail,
            'path' => $this->path,
            'users' => $this->whenLoaded(
                'users',
                fn() => $this->users->map(
                    fn($user) => [
                        'id' => $user->id,
                        'email' => $user->email,
                        'name' => $user->name,
                        'image' => $user->image,
                        'owns_entry' => (bool) $user->pivot->owner,
                    ],
                ),
            ),
        ];
    }
}
