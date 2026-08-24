<?php

namespace App\Stores\Controllers;

use App\Stores\Models\Store;
use App\Biolinks\Models\BiolinkWidget;
use App\Links\Models\Link;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

#[Group('Stores', weight: 7)]
class StoreContentOrderController extends Controller
{
    public function changeOrder(Request $request)
    {
        $storeId = $request->route('store') ?? $request->route('biolink') ?? $request->route('id');
        $store = $storeId instanceof Store ? $storeId : Store::findOrFail($storeId);

        Gate::authorize('update', $store);

        $data = $request->validate([
            'order' => 'array|min:1',
            'order.*.id' => 'required|integer',
            'order.*.model_type' => 'required|string',
            'widgetToPin' => 'integer',
        ]);

        $widgetQuery = '';
        $linkQuery = '';
        foreach ($data['order'] as $position => $value) {
            $position++;
            $id = $value['id'];
            if ($value['model_type'] === Link::MODEL_TYPE) {
                $linkQuery .= " when link_id=$id then $position";
            } else {
                $widgetQuery .= " when id=$id then $position";
            }
        }

        if ($linkQuery) {
            $linkIds = collect($data['order'])->where('model_type', Link::MODEL_TYPE)->pluck('id');
            DB::table('biolink_link')->where('biolink_id', $store->id)->whereIn('link_id', $linkIds)->update(['position' => DB::raw("(case $linkQuery end)")]);
        }

        if ($widgetQuery) {
            $widgetIds = collect($data['order'])->where('model_type', BiolinkWidget::MODEL_TYPE)->pluck('id');
            BiolinkWidget::where('biolink_id', $store->id)->whereIn('id', $widgetIds)->update(['position' => DB::raw("(case $widgetQuery end)")]);
        }

        if (isset($data['widgetToPin'])) {
            BiolinkWidget::where('id', $data['widgetToPin'])->update(['pinned' => 'top']);
        }

        return response()->noContent();
    }
}
