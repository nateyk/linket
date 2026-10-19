<?php

namespace App\CreatorServices\Controllers;

use App\CreatorServices\Actions\CrupdateCreatorService;
use App\CreatorServices\Models\CreatorService;
use App\CreatorServices\Resources\CreatorServiceResource;
use App\Stores\Models\Store;
use Common\Workspaces\ActiveWorkspace;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controller;

class CreatorServicesController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min(max($request->integer('per_page', 50), 1), 100);

        return CreatorServiceResource::collection(
            CreatorService::query()
                ->where('workspace_id', ActiveWorkspace::get()->id)
                ->where('user_id', $request->user()->id)
                ->with(['store.domain', 'cover', 'images.file', 'packages', 'faqs'])
                ->withCount([
                    'inquiries',
                    'inquiries as new_inquiries_count' => fn (Builder $query): Builder => $query->where('status', 'new'),
                ])
                ->latest()
                ->paginate($perPage),
        );
    }

    public function show(Request $request, CreatorService $service): CreatorServiceResource
    {
        $this->assertOwner($service, $request);

        return new CreatorServiceResource(
            $service->load(['store.domain', 'cover', 'images.file', 'packages', 'faqs'])
                ->loadCount([
                    'inquiries',
                    'inquiries as new_inquiries_count' => fn (Builder $query): Builder => $query->where('status', 'new'),
                ]),
        );
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $service = app(CrupdateCreatorService::class)->execute($data, $request->user());

        return (new CreatorServiceResource($service))->response()->setStatusCode(201);
    }

    public function update(Request $request, CreatorService $service): CreatorServiceResource
    {
        $this->assertOwner($service, $request);
        $data = $this->validated($request);

        return new CreatorServiceResource(
            app(CrupdateCreatorService::class)->execute($data, $request->user(), $service),
        );
    }

    public function destroy(Request $request, CreatorService $service)
    {
        $this->assertOwner($service, $request);
        $service->delete();

        return response()->noContent();
    }

    private function assertOwner(CreatorService $service, Request $request): void
    {
        abort_unless(
            $service->workspace_id === ActiveWorkspace::get()->id
                && $service->user_id === $request->user()->id,
            404,
        );
    }

    private function validated(Request $request): array
    {
        $workspaceId = ActiveWorkspace::get()->id;

        return $request->validate([
            'title' => 'required|string|max:160',
            'store_id' => [
                'required',
                'integer',
                function (string $attribute, mixed $value, \Closure $fail) use ($workspaceId): void {
                    $exists = Store::query()
                        ->whereKey($value)
                        ->where('workspace_id', $workspaceId)
                        ->exists();

                    if (!$exists) {
                        $fail(__('Select one of your storefronts.'));
                    }
                },
            ],
            'short_description' => 'nullable|string|max:240',
            'description' => 'nullable|string|max:50000',
            'category' => 'nullable|string|max:80',
            'skills' => 'nullable|array|max:20',
            'skills.*' => 'string|max:40',
            'cover_file_entry_id' => 'nullable|integer|exists:file_entries,id',
            'gallery_file_entry_ids' => 'nullable|array|max:8',
            'gallery_file_entry_ids.*' => 'integer|distinct|exists:file_entries,id',
            'video_url' => 'nullable|url|max:500',
            'live_demo_url' => 'nullable|url|max:500',
            'status' => 'nullable|in:draft,published',
            'contact_channels' => 'nullable|array|max:6',
            'contact_channels.*.type' => 'required|in:whatsapp,telegram,email,phone,link',
            'contact_channels.*.label' => 'nullable|string|max:60',
            'contact_channels.*.value' => 'required|string|max:300',
            'packages' => 'nullable|array|max:6',
            'packages.*.id' => 'nullable|integer',
            'packages.*.name' => 'required|string|max:80',
            'packages.*.description' => 'nullable|string|max:3000',
            'packages.*.price_cents' => 'nullable|integer|min:0|max:1000000000',
            'packages.*.delivery_days' => 'nullable|integer|min:0|max:365',
            'packages.*.revisions' => 'nullable|integer|min:0|max:100',
            'packages.*.features' => 'nullable|array|max:20',
            'packages.*.features.*' => 'string|max:200',
            'faqs' => 'nullable|array|max:20',
            'faqs.*.question' => 'required|string|max:240',
            'faqs.*.answer' => 'required|string|max:3000',
        ]);
    }
}
