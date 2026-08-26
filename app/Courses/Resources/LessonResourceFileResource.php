<?php

namespace App\Courses\Resources;

use App\Courses\Models\LessonResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin LessonResource */
class LessonResourceFileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lesson_id' => $this->lesson_id,
            'file_entry_id' => $this->file_entry_id,
            'display_name' => $this->display_name,
            'size' => $this->size,
            'mime' => $this->mime,
            'sort_order' => $this->sort_order,
            'file' => $this->whenLoaded('file', fn() => $this->file ? [
                'id' => $this->file->id,
                'name' => $this->file->name,
                'extension' => $this->file->extension,
                'file_size' => $this->file->file_size,
                'mime' => $this->file->mime,
            ] : null),
            'created_at' => $this->created_at,
        ];
    }
}
