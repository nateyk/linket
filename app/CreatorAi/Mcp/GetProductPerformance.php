<?php

namespace App\CreatorAi\Mcp;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[IsReadOnly]
final class GetProductPerformance extends CreatorMcpReadOnlyTool
{
    protected string $name = 'linket.get_product_performance';
    protected string $title = 'Product performance';
    protected string $description = 'Read sanitized per-product verified order counts and gross ETB revenue.';
    protected string $ability = 'product_performance';
    protected string $reportTool = 'product_performance';

    public function schema(JsonSchema $schema): array
    {
        return [
            ...parent::schema($schema),
            'limit' => $schema->integer()->description('Maximum number of products, at most 20'),
        ];
    }
}
