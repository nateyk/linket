<?php

namespace App\CreatorAi\Mcp;

use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[IsReadOnly]
final class GetSalesTrends extends CreatorMcpReadOnlyTool
{
    protected string $name = 'linket.get_sales_trends';
    protected string $title = 'Verified sales trends';
    protected string $description = 'Read daily, verified ETB sales counts and gross revenue by date for the connected creator.';
    protected string $ability = 'sales_trends';
    protected string $reportTool = 'sales_trends';
}
