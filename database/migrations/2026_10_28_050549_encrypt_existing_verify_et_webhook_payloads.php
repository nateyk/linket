<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $this->encryptColumn('verify_et_webhook_deliveries', 'payload', 'encrypted');
        $this->encryptColumn('direct_payment_verifications', 'provider_input', '_verify_et_encrypted_v1');
        $this->encryptColumn('direct_payment_verifications', 'provider_result', '_verify_et_encrypted_v1');
    }

    private function encryptColumn(string $table, string $column, string $marker): void
    {
        DB::table($table)->whereNotNull($column)->orderBy('id')->chunkById(100, function ($rows) use ($table, $column, $marker): void {
            foreach ($rows as $row) {
                $value = $row->{$column};
                $payload = is_string($value) ? $value : json_encode($value, JSON_THROW_ON_ERROR);
                $decoded = json_decode($payload, true);
                if (is_array($decoded) && is_string($decoded[$marker] ?? null)) {
                    Crypt::decryptString($decoded[$marker]);
                    continue;
                }
                DB::table($table)->where('id', $row->id)->update([
                    $column => json_encode([$marker => Crypt::encryptString($payload)], JSON_THROW_ON_ERROR),
                ]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Retain encrypted evidence when rolling back.
    }
};
