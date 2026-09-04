<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProduct;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

class AdminDigitalProductsController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('admin.access');

        $search = $request->string('search');
        $status = $request->string('status');
        $sort = $request->string('sort');

        $query = DigitalProduct::query()
            ->with(['creator', 'cover', 'files', 'biolinks'])
            ->withCount([
                'reviews',
                'reviews as hidden_reviews_count' => fn ($q) => $q->where('approved', false),
            ]);

        $query->when($search->isNotEmpty(), function ($q) use ($search) {
            $q->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhereHas('creator', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('username', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        });

        $query->when($status->isNotEmpty(), fn($q) => $q->where('status', $status));

        // Handle sorting: sort=id:desc or price_cents:asc, etc.
        $allowedSorts = ['id', 'title', 'price_cents', 'created_at', 'status'];
        if ($sort->isNotEmpty()) {
            [$field, $direction] = array_pad(explode(':', (string) $sort, 2), 2, 'desc');
            $field = in_array($field, $allowedSorts, true) ? $field : 'created_at';
            $direction = strtolower($direction) === 'asc' ? 'asc' : 'desc';
            $query->orderBy($field, $direction);
        } else {
            $query->latest();
        }

        $counters = [
            'total' => ['total' => DigitalProduct::count()],
            'pending_approval' => ['total' => DigitalProduct::where('status', 'pending_approval')->count()],
            'approved' => ['total' => DigitalProduct::where('status', 'approved')->count()],
            'rejected' => ['total' => DigitalProduct::where('status', 'rejected')->count()],
            'draft' => ['total' => DigitalProduct::where('status', 'draft')->count()],
        ];

        $products = $query->paginate((int) $request->input('perPage', 15));
        $products->appends($request->only(['search', 'status', 'perPage', 'sort']));

        $paginated = $products->toArray();
        $paginated['meta'] = array_merge($paginated['meta'] ?? [], ['counters' => $counters]);

        return response()->json($paginated);
    }

    public function approve(DigitalProduct $digitalProduct) { Gate::authorize('admin.access'); abort_unless($digitalProduct->status === 'pending_approval', 422); $digitalProduct->update(['status' => 'approved', 'approved_at' => now(), 'rejection_reason' => null]); return $digitalProduct->fresh(); }
    public function reject(Request $request, DigitalProduct $digitalProduct) { Gate::authorize('admin.access'); abort_unless($digitalProduct->status === 'pending_approval', 422); $data = $request->validate(['reason' => 'nullable|string|max:2000']); $digitalProduct->update(['status' => 'rejected', 'rejection_reason' => $data['reason'] ?? null]); return $digitalProduct->fresh(); }
}
