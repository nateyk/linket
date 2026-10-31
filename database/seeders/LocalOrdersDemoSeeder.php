<?php

namespace Database\Seeders;

use App\Models\User;
use App\Payments\Models\DirectPaymentVerification;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\DownloadEntitlement;
use App\Storefront\Models\StorefrontOrder;
use App\Stores\Models\Store;
use Common\Files\FileEntry;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class LocalOrdersDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (!app()->environment('local') || getenv('IS_DDEV_PROJECT') !== 'true' || DB::connection()->getDatabaseName() !== 'db') {
            throw new RuntimeException('This seeder is restricted to the local DDEV Linket database.');
        }

        $marker = 'local.orders_demo.seeded_v1';
        if (DB::table('settings')->where('name', $marker)->exists()) {
            $this->command?->info('Local orders demo already exists; no records changed.');
            return;
        }

        $password = getenv('LINKET_DEMO_PASSWORD');
        if (!is_string($password) || strlen($password) < 12) {
            throw new RuntimeException('Set LINKET_DEMO_PASSWORD to a local-only password of at least 12 characters.');
        }
        if (User::query()->whereIn('email', ['orders-demo-creator@example.test', 'orders-demo-buyer@example.test'])->exists()
            || Store::query()->where('back_half', 'linket-orders-demo')->exists()) {
            throw new RuntimeException('Demo identifiers already exist without the seeder marker; no records changed.');
        }

        DB::transaction(function () use ($marker, $password): void {
            $creator = User::query()->create(['name' => 'Orders Demo Creator', 'email' => 'orders-demo-creator@example.test', 'password' => Hash::make($password), 'email_verified_at' => now()]);
            $buyer = User::query()->create(['name' => 'Orders Demo Buyer', 'email' => 'orders-demo-buyer@example.test', 'password' => Hash::make(Str::random(40)), 'email_verified_at' => now()]);
            $workspace = app(CreateWorkspace::class)->createPersonalWorkspace($creator);
            $store = Store::query()->create(['name' => 'Synthetic Orders Demo Store', 'back_half' => 'linket-orders-demo', 'user_id' => $creator->id, 'workspace_id' => $workspace->id]);
            $product = DigitalProduct::query()->create(['workspace_id' => $workspace->id, 'user_id' => $creator->id, 'title' => 'Synthetic Demo Workbook', 'description' => 'Synthetic local demo product.', 'price_cents' => 10000, 'currency' => 'ETB', 'status' => 'approved', 'approved_at' => now(), 'type' => 'digital']);
            $product->stores()->attach($store->id);
            $file = FileEntry::query()->create(['name' => 'synthetic-demo.pdf', 'file_name' => 'linket-demo-'.Str::random(24), 'file_size' => 1024, 'mime' => 'application/pdf', 'extension' => 'pdf', 'type' => 'file', 'workspace_id' => $workspace->id, 'owner_id' => $creator->id]);
            $product->files()->attach($file->id);

            foreach (range(1, 30) as $index) {
                $status = match ($index) { 1, 2 => 'paid', 3 => 'manual_review', default => 'pending_payment' };
                $reference = 'LOCAL-DEMO-'.Str::uuid();
                $order = StorefrontOrder::query()->create([
                    'uuid' => (string) Str::uuid(), 'digital_product_id' => $product->id,
                    'biolink_id' => $store->id, 'creator_id' => $creator->id, 'buyer_user_id' => $buyer->id,
                    'buyer_name' => 'Synthetic Demo Buyer', 'buyer_email' => $buyer->email,
                    'currency' => 'ETB', 'gross_amount_cents' => 10000, 'commission_bps' => 0,
                    'platform_fee_cents' => 0, 'creator_earnings_cents' => 10000,
                    'status' => $status, 'payment_gateway' => 'verify_et', 'payment_reference' => $reference,
                    'payment_provider_snapshot' => 'cbe', 'payment_account_snapshot' => '0000000006789',
                    'paid_at' => $status === 'paid' ? now() : null,
                ]);
                if ($status === 'paid') {
                    DownloadEntitlement::query()->create(['token' => (string) Str::uuid(), 'storefront_order_id' => $order->id, 'file_entry_id' => $file->id, 'download_count' => $index === 1 ? 1 : 0, 'download_limit' => 10, 'expires_at' => now()->addDays(30)]);
                }
                if ($status === 'manual_review') {
                    DirectPaymentVerification::query()->create(['reference' => $reference, 'payable_type' => StorefrontOrder::class, 'payable_id' => $order->id, 'bank_code' => 'cbe', 'settlement_account' => '0000000006789', 'amount_cents' => 10000, 'currency' => 'ETB', 'status' => 'manual_review', 'latest_error_code' => 'synthetic_demo', 'attempt' => 1]);
                }
            }
            DB::table('settings')->insert(['name' => $marker, 'value' => (string) $creator->id, 'private' => true, 'created_at' => now(), 'updated_at' => now()]);
        });

        $this->command?->info('Synthetic local Orders & Sales demo created.');
    }
}
