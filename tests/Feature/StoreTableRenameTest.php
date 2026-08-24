<?php

use Illuminate\Support\Facades\Schema;

it('stores table exists after rename', function () {
    if (! config('stores.table_rename_done')) {
        $this->markTestSkipped('stores.table_rename_done is false — phase 3 not active');
    }

    expect(Schema::hasTable('stores'))->toBeTrue();
    expect(Schema::hasTable('biolinks'))->toBeFalse();
    expect(Schema::hasTable('store_appearances'))->toBeTrue();
    expect(Schema::hasTable('biolink_appearances'))->toBeFalse();
    expect(Schema::hasTable('store_widgets'))->toBeTrue();
    expect(Schema::hasTable('biolink_widgets'))->toBeFalse();
    expect(Schema::hasTable('store_link'))->toBeTrue();
    expect(Schema::hasTable('biolink_link'))->toBeFalse();
    expect(Schema::hasTable('digital_product_store'))->toBeTrue();
    expect(Schema::hasTable('digital_product_biolinks'))->toBeFalse();
});

it('stores not renamed when flag false', function () {
    if (config('stores.table_rename_done')) {
        $this->markTestSkipped('flag true — skip inverse assertion');
    }

    expect(Schema::hasTable('biolinks'))->toBeTrue();
    expect(Schema::hasTable('stores'))->toBeFalse();
});
