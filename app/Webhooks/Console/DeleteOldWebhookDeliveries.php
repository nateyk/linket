<?php

namespace App\Webhooks\Console;

use App\Webhooks\Models\WebhookDelivery;
use App\Webhooks\Models\WebhookDeliveryAttempt;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class DeleteOldWebhookDeliveries extends Command
{
    protected $signature = 'webhooks:delete-old-deliveries {--days=30 : Delete records older than this many days} {--chunk=1000 : Number of deliveries to delete per batch}';

    protected $description = 'Delete old webhook deliveries and attempts';

    public function handle(): int
    {
        $days = max((int) $this->option('days'), 1);
        $chunkSize = max((int) $this->option('chunk'), 1);
        $cutoff = Carbon::now()->subDays($days);

        $deletedDeliveries = 0;
        $deletedAttempts = 0;

        WebhookDelivery::query()
            ->select('id')
            ->where('created_at', '<', $cutoff)
            ->orderBy('id')
            ->chunkById($chunkSize, function ($deliveries) use (
                &$deletedDeliveries,
                &$deletedAttempts,
            ) {
                $deliveryIds = $deliveries->pluck('id');

                $deletedAttempts += WebhookDeliveryAttempt::attempts()
                    ->whereIn('webhook_delivery_id', $deliveryIds)
                    ->delete();

                $deletedDeliveries += WebhookDelivery::query()
                    ->whereIn('id', $deliveryIds)
                    ->delete();
            });

        $this->info(
            "Cleaned up webhook delivery logs older than {$days} days.",
        );

        return 0;
    }
}
