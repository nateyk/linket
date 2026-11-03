<?php

namespace App\CreatorAi\Services;

use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use App\Storefront\Models\StorefrontOrder;
use Carbon\CarbonImmutable;
use Common\Workspaces\Models\Workspace;
use InvalidArgumentException;

/**
 * Read-only reporting contract shared by the dashboard and future MCP tools.
 *
 * A caller must supply the authenticated creator and their explicitly
 * authorized workspace. This service deliberately never resolves an active
 * workspace from cookies, query parameters or a fallback creator workspace.
 */
final class SalesSummaryService
{
    /**
     * @return array{verified_sales_count: int, verified_revenue_cents: int, currency: string, from: string, to: string}
     */
    public function summary(
        User $creator,
        int $workspaceId,
        CarbonImmutable $from,
        CarbonImmutable $to,
    ): array {
        $start = $from->toDateString();
        $end = $to->toDateString();

        if ($start > $end) {
            throw new InvalidArgumentException('The reporting start date cannot follow the end date.');
        }

        // Fail closed even if the caller supplies another creator's workspace ID.
        abort_unless(
            Workspace::query()->forUser((int) $creator->id)->whereKey($workspaceId)->exists(),
            403,
        );

        // The product subquery enforces workspace boundaries. Keep deleted
        // products in historical reporting, but never infer ownership from
        // caller-controlled product, workspace or order identifiers.
        $productIds = DigitalProduct::query()
            ->withTrashed()
            ->where('workspace_id', $workspaceId)
            ->where('user_id', $creator->id)
            ->select('id');

        $verified = StorefrontOrder::query()
            ->where('creator_id', $creator->id)
            ->whereIn('digital_product_id', $productIds)
            ->whereIn('status', ['paid', 'fulfilled'])
            ->where('currency', 'ETB')
            ->whereNotNull('paid_at')
            ->whereDate('paid_at', '>=', $start)
            ->whereDate('paid_at', '<=', $end);

        // Explicit output allowlist: no buyer name/email, transaction
        // reference, receiving account, payment evidence or file token.
        return [
            'verified_sales_count' => (clone $verified)->count(),
            'verified_revenue_cents' => (int) $verified->sum('gross_amount_cents'),
            'currency' => 'ETB',
            'from' => $start,
            'to' => $end,
        ];
    }
}
