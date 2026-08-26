<?php

namespace App\Courses\Resources;

use App\Courses\Models\Lesson;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

/** @mixin Lesson */
class LessonResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isCreatorPreview = $request->boolean('preview') && $request->user() && $this->resource->course && $this->resource->course->product && $this->resource->course->product->user_id === $request->user()->id;

        // Never expose draft content to non-preview users; handled at controller filter as well.
        $content = $this->content;
        // Sanitize: if content contains script, strip via purifier when rendering; store raw.
        // Here we just return raw but frontend will render via safe pipeline.

        return [
            'id' => $this->id,
            'chapter_id' => $this->chapter_id,
            'course_id' => $this->course_id,
            'title' => $this->title,
            'content' => $content,
            'video_type' => $this->video_type,
            'video_file_entry_id' => $this->video_file_entry_id,
            'video_url' => $this->video_url,
            'video' => $this->whenLoaded('videoFile', fn() => $this->videoFile ? [
                'id' => $this->videoFile->id,
                'name' => $this->videoFile->name,
                'url' => $this->videoFile->url,
                'mime' => $this->videoFile->mime,
            ] : null),
            'duration_seconds' => $this->duration_seconds,
            'status' => $this->status,
            'sort_order' => $this->sort_order,
            'resources' => LessonResourceFileResource::collection($this->whenLoaded('resources')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
