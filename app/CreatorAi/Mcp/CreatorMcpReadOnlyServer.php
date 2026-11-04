<?php

namespace App\CreatorAi\Mcp;

use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Methods\CallTool;
use Laravel\Mcp\Server\Methods\Discover;
use Laravel\Mcp\Server\Methods\Initialize;
use Laravel\Mcp\Server\Methods\ListTools;
use Laravel\Mcp\Server\Methods\Ping;

/** Only scoped, deterministic read operations. No resources or write methods. */
final class CreatorMcpReadOnlyServer extends Server
{
    protected string $name = 'Linket Creator Reports';

    protected string $version = '1.0.0';

    protected string $instructions = 'Use these read-only tools only for the connected creator workspace. Report verified ETB values and data limitations; do not infer payment confirmation.';

    /** @var list<string> */
    protected array $supportedProtocolVersion = ['2026-07-28', '2025-11-25'];

    protected array $capabilities = [
        self::CAPABILITY_TOOLS => ['listChanged' => false],
    ];

    protected array $tools = [
        GetSalesSummary::class,
        GetSalesTrends::class,
        GetOrderInsights::class,
        ListOrders::class,
        GetProductPerformance::class,
    ];

    protected array $methods = [
        'server/discover' => Discover::class,
        'initialize' => Initialize::class,
        'ping' => Ping::class,
        'tools/list' => ListTools::class,
        'tools/call' => CallTool::class,
    ];
}
