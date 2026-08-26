<?php

namespace App\Courses\Resources;

use App\Courses\Models\Chapter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Chapter */
class ChapterResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'course_id' => $this->course_id,
            'title' => $this->title,
            'sort_order' => $this->sort_order,
            'lessons' => LessonResource::collection($this->whenLoaded('lessons')),
            'lessons_count' => $this->whenCounted('lessons'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
