<?php

namespace App\CreatorAi\Mcp;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[IsReadOnly]
final class ListOrders extends CreatorMcpReadOnlyTool
{
    protected string $name = 'linket.list_orders';
    protected string $title = 'List verified orders';
    protected string $description = 'Paginate sanitized verified creator orders. Buyer and payment-account details are never returned.';
    protected string $ability = 'order_insights';
    protected string $reportTool = 'list_orders';

    public function schema(JsonSchema $schema): array
    {
        return [
            ...parent::schema($schema),
            'page' => $schema->integer()->description('Page number, from 1 through 100'),
            'per_page' => $schema->integer()->description('Results per page, at most 20'),
        ];
    }
}
