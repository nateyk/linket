<?php

namespace App\Storefront\Commands;

use App\Storefront\Models\CommissionInvoice;
use Illuminate\Console\Command;

final class EnforceCommissionRestrictions extends Command
{
    protected $signature = 'billing:enforce-commission-restrictions';
    protected $description = 'Mark overdue commission invoices for creator billing views.';

    public function handle(): int
    {
        CommissionInvoice::query()->where('status', 'pending')->where('due_at', '<', now())
            ->update(['status' => 'overdue']);

        return self::SUCCESS;
    }
}
