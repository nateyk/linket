<?php

namespace App\Storefront\Controllers;

use App\Storefront\Models\DigitalProduct;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;

class AdminDigitalProductsController extends Controller
{
    public function index(Request $request) { Gate::authorize('admin.access'); return DigitalProduct::query()->with(['creator', 'cover', 'files', 'biolinks'])->when($request->string('status')->isNotEmpty(), fn($query) => $query->where('status', $request->string('status')))->latest()->paginate(); }
    public function approve(DigitalProduct $digitalProduct) { Gate::authorize('admin.access'); abort_unless($digitalProduct->status === 'pending_approval', 422); $digitalProduct->update(['status' => 'approved', 'approved_at' => now(), 'rejection_reason' => null]); return $digitalProduct->fresh(); }
    public function reject(Request $request, DigitalProduct $digitalProduct) { Gate::authorize('admin.access'); abort_unless($digitalProduct->status === 'pending_approval', 422); $data = $request->validate(['reason' => 'nullable|string|max:2000']); $digitalProduct->update(['status' => 'rejected', 'rejection_reason' => $data['reason'] ?? null]); return $digitalProduct->fresh(); }
}
