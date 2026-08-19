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

        $counters = [
            'pending_approval' => ['total' => DigitalProduct::where('status', 'pending_approval')->count()],
            'approved' => ['total' => DigitalProduct::where('status', 'approved')->count()],
            'rejected' => ['total' => DigitalProduct::where('status', 'rejected')->count()],
        ];

        $products = $query->latest()->paginate((int) $request->input('perPage', 15));
        $products->appends($request->only(['search', 'status', 'perPage']));

        $paginated = $products->toArray();
        $paginated['meta'] = array_merge($paginated['meta'] ?? [], ['counters' => $counters]);

        return response()->json($paginated);
    }

    public function approve(DigitalProduct $digitalProduct) { Gate::authorize('admin.access'); abort_unless($digitalProduct->status === 'pending_approval', 422); $digitalProduct->update(['status' => 'approved', 'approved_at' => now(), 'rejection_reason' => null]); return $digitalProduct->fresh(); }
    public function reject(Request $request, DigitalProduct $digitalProduct) { Gate::authorize('admin.access'); abort_unless($digitalProduct->status === 'pending_approval', 422); $data = $request->validate(['reason' => 'nullable|string|max:2000']); $digitalProduct->update(['status' => 'rejected', 'rejection_reason' => $data['reason'] ?? null]); return $digitalProduct->fresh(); }
}
