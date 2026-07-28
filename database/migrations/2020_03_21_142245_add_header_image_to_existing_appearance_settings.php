<?php

use Common\Settings\Models\Setting;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Arr;

class AddHeaderImageToExistingAppearanceSettings extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        $existing = app(Setting::class)
            ->where('name', 'homepage.appearance')
            ->first();

        if ($existing && $existing->value) {
            $default = Arr::first(config('common.default-settings'), function (
                $setting,
            ) {
                return $setting['name'] === 'homepage.appearance';
            })['value'];
            $existing->value = json_encode(
                array_merge(
                    json_decode($existing->value, true),
                    json_decode($default, true),
                ),
            );
            $existing->save();
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
    }
}
