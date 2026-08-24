<?php

use Illuminate\Database\Eloquent\Relations\Relation;

it('store and biolink resolve same table and morph', function () {
    expect(\App\Stores\Models\Store::MODEL_TYPE)->toBe('store');
    expect((new \App\Biolinks\Models\Biolink())->getTable())->toBe('biolinks');
    expect((new \App\Stores\Models\Store())->getTable())->toBe('biolinks'); // before rename
    expect(Relation::getMorphedModel('biolink'))->toBe(\App\Stores\Models\Store::class);
});
