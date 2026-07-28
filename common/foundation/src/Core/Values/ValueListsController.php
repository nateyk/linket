<?php

namespace Common\Core\Values;

use Common\Core\Values\ValueLists;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Routing\Controller;

#[ExcludeRoutesFromPublicDocs]
class ValueListsController extends Controller
{
    public function index(string $names)
    {
        $values = app(ValueLists::class)->get($names, request()->all());
        return response()->json($values);
    }
}
