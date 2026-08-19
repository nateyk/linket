<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('digital_product_biolinks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('digital_product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('biolink_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['digital_product_id', 'biolink_id']);
        });

        Schema::create('digital_product_payout_methods', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('creator_id');
            $table->string('type');
            $table->string('account_holder');
            $table->text('destination');
            $table->string('display_label');
            $table->timestamps();
            $table->foreign('creator_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['workspace_id', 'creator_id']);
        });

        Schema::table('payout_requests', function (Blueprint $table): void {
            $table->foreignId('digital_product_payout_method_id')
                ->nullable()
                ->after('creator_id')
                ->constrained('digital_product_payout_methods')
                ->nullOnDelete();
            $table->string('payout_method_label')->nullable()->after('currency');
        });

        $setting = DB::table('settings')->where('name', 'menus')->first();
        if (!$setting) {
            return;
        }

        $menus = json_decode((string) $setting->value, true);
        if (!is_array($menus)) {
            return;
        }

        foreach ($menus as &$menu) {
            $position = $menu['positions'][0] ?? null;
            $route = match ($position) {
                'dashboard-primary' => ['/dashboard/my-products', 'Digital Products'],
                'dashboard-secondary' => ['/dashboard/sales-payouts', 'Sales & Payouts'],
                'admin-sidebar' => ['/admin/digital-products', 'Digital Products'],
                default => null,
            };

            if (!$route || collect($menu['items'] ?? [])->contains(fn(array $item) => ($item['action'] ?? null) === $route[0])) {
                continue;
            }

            $menu['items'][] = [
                'type' => 'route',
                'label' => $route[1],
                'action' => $route[0],
                'id' => 'digital-products-' . $position,
            ];
        }

        DB::table('settings')->where('name', 'menus')->update(['value' => json_encode($menus)]);
    }

    public function down(): void
    {
        Schema::table('payout_requests', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('digital_product_payout_method_id');
            $table->dropColumn('payout_method_label');
        });
        Schema::dropIfExists('digital_product_payout_methods');
        Schema::dropIfExists('digital_product_biolinks');
    }
};
