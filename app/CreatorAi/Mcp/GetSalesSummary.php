<?php

namespace App\CreatorAi\Mcp;

use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[IsReadOnly]
final class GetSalesSummary extends CreatorMcpReadOnlyTool
{
    protected string $name = 'linket.get_sales_summary';
    protected string $title = 'Verified sales summary';
    protected string $description = 'Read the verified gross ETB amount and sale count for an authorized UTC date range.';
    protected string $ability = 'sales_summary';
    protected string $reportTool = 'sales_summary';
}
