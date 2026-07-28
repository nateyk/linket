<?php

namespace App\Biolinks\Controllers;

use App\Biolinks\Models\Biolink;
use App\Biolinks\Models\BiolinkWidget;
use App\Links\Models\Link;
use Dedoc\Scramble\Attributes\Group;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

#[Group('Biolinks', weight: 7)]
class BiolinkContentOrderController extends Controller
{
    /**
     * Change order of biolink content.
     *
     * @operationId changeBiolinkContentOrder
     */
    public function changeOrder(int $id, Request $request)
    {
        $biolink = Biolink::findOrFail($id);

        Gate::authorize('update', $biolink);

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
            $linkIds = collect($data['order'])
                ->where('model_type', Link::MODEL_TYPE)
                ->pluck('id');
            DB::table('biolink_link')
                ->where('biolink_id', $biolink->id)
                ->whereIn('link_id', $linkIds)
                ->update(['position' => DB::raw("(case $linkQuery end)")]);
        }

        if ($widgetQuery) {
            $widgetIds = collect($data['order'])
                ->where('model_type', BiolinkWidget::MODEL_TYPE)
                ->pluck('id');
            BiolinkWidget::where('biolink_id', $biolink->id)
                ->whereIn('id', $widgetIds)
                ->update(['position' => DB::raw("(case $widgetQuery end)")]);
        }

        if (isset($data['widgetToPin'])) {
            BiolinkWidget::where('id', $data['widgetToPin'])->update([
                'pinned' => 'top',
            ]);
        }

        return response()->noContent();
    }
}
