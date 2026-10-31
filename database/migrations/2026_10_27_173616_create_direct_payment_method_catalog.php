<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('direct_payment_method_catalog', function (Blueprint $table): void {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('display_name', 80);
            $table->boolean('creator_setup_enabled')->default(true);
            $table->boolean('checkout_enabled')->default(true);
            $table->boolean('automated_verification_supported')->default(true);
            $table->boolean('recipient_matching_supported')->default(true);
            $table->boolean('manual_review_eligible')->default(true);
            $table->boolean('operationally_suspended')->default(false);
            $table->json('required_transaction_fields')->nullable();
            $table->json('required_account_fields')->nullable();
            $table->text('checkout_instructions')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
        foreach ([
            ['cbe', 'Commercial Bank of Ethiopia', ['reference'], ['account_number']],
            ['telebirr', 'Telebirr', ['transactionNumber'], ['phone_number']],
            ['boa', 'Bank of Abyssinia', ['referenceNumber', 'accountSuffix'], ['account_number']],
            ['awash', 'Awash Bank', ['referenceNumber'], ['account_number']],
            ['dashen', 'Dashen Bank', ['referenceNumber'], ['account_number']],
            ['mpesa', 'M-Pesa', ['transactionNumber'], ['phone_number']],
            ['cbebirr', 'CBE Birr', ['receiptNumber', 'phoneNumber'], ['phone_number']],
            ['siinqee', 'Siinqee Bank', ['referenceNumber'], ['account_number']],
            ['kaafiebirr', 'Kaafie Birr', ['referenceNumber'], ['phone_number']],
            ['coopayebirr', 'Coopay Ebirr', ['referenceNumber'], ['phone_number']],
        ] as $index => [$code, $name, $transaction, $account]) {
            DB::table('direct_payment_method_catalog')->insert(['code' => $code, 'display_name' => $name, 'required_transaction_fields' => json_encode($transaction), 'required_account_fields' => json_encode($account), 'sort_order' => ($index + 1) * 10, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('direct_payment_method_catalog');
    }
};
