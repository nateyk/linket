<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('digital_product_payout_methods')) {
            Schema::table('digital_product_payout_methods', function (Blueprint $table): void {
                $table->unsignedBigInteger('approved_by')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->text('review_note')->nullable();
            });
            // Existing accounts were previously self-approved. Require human review before payout.
            DB::table('digital_product_payout_methods')
                ->where('is_active', true)
                ->where('status', 'active')
                ->update(['status' => 'pending_verification', 'approved_by' => null, 'approved_at' => null]);
        }

        if (Schema::hasTable('payout_requests')) {
            Schema::table('payout_requests', function (Blueprint $table): void {
                $table->string('account_holder_snapshot', 160)->nullable();
                $table->string('bank_code_snapshot', 64)->nullable();
            });
        }

        if (Schema::hasTable('digital_product_withdrawal_methods')) {
            foreach ([
                ['code' => 'telebirr', 'name' => 'Telebirr', 'label' => 'Telebirr phone number'],
                ['code' => 'mpesa', 'name' => 'M-Pesa', 'label' => 'M-Pesa phone number'],
                ['code' => 'yaya', 'name' => 'Yaya Wallet', 'label' => 'Yaya wallet number'],
                ['code' => 'cbebirr', 'name' => 'CBE Birr', 'label' => 'CBE Birr phone number'],
            ] as $position => $method) {
                if (DB::table('digital_product_withdrawal_methods')->where('code', $method['code'])->exists()) {
                    continue; // Do not override an administrator's existing enable/disable choice.
                }
                DB::table('digital_product_withdrawal_methods')->insert([
                    'code' => $method['code'],
                    'name' => $method['name'],
                    'destination_label' => $method['label'],
                    'minimum_amount_cents' => 100,
                    'is_active' => false, // Explicit admin opt-in, after sandbox acceptance.
                    'position' => $position + 2,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('payout_requests')) {
            Schema::table('payout_requests', fn (Blueprint $table) => $table->dropColumn([
                'account_holder_snapshot', 'bank_code_snapshot',
            ]));
        }
        if (Schema::hasTable('digital_product_payout_methods')) {
            Schema::table('digital_product_payout_methods', fn (Blueprint $table) => $table->dropColumn([
                'approved_by', 'approved_at', 'review_note',
            ]));
        }
        // Never delete payout method definitions in rollback: they may be referenced by requests.
    }
};
