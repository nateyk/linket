<?php

namespace App\CreatorServices\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'featured' => $this->featured,
            'add_to_menu' => $this->add_to_menu,
            'status' => $this->status,
            'position' => $this->position,
            'services_count' => $this->whenCounted('services'),
            'subcategories' => ServiceSubcategoryResource::collection(
                $this->whenLoaded('subcategories'),
            ),
        ];
    }
}
