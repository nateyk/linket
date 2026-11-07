<?php

namespace App\CreatorAi\Mcp;

use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[IsReadOnly]
final class GetOrderInsights extends CreatorMcpReadOnlyTool
{
    protected string $name = 'linket.get_order_insights';
    protected string $title = 'Order insights';
    protected string $description = 'Read sanitized order state counts and non-sensitive reporting insights.';
    protected string $ability = 'order_insights';
    protected string $reportTool = 'order_insights';
}
