<?php

namespace App\CreatorAi\Mcp;

use App\CreatorAi\Auth\CreatorMcpOAuthRemoteSecurity;
use App\CreatorAi\Services\CreatorMcpToolGateway;
use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Tool;

/**
 * Tool inputs contain only bounded reporting parameters. The creator, OAuth
 * client, workspace and consent grant come exclusively from the verified HTTP
 * bearer, never from MCP JSON-RPC arguments or Laravel's web guard.
 */
abstract class CreatorMcpReadOnlyTool extends Tool
{
    protected string $ability = '';

    protected string $reportTool = '';

    public function shouldRegister(): bool
    {
        return $this->ability !== ''
            && config('creator_ai.features.'.$this->ability) === true;
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'from' => $schema->string()->required()->description('UTC start date (YYYY-MM-DD)'),
            'to' => $schema->string()->required()->description('UTC end date (YYYY-MM-DD)'),
        ];
    }

    /**
     * ChatGPT requires per-tool OAuth metadata to discover the linking policy.
     * Advertising a scope is not authorization: the HTTP bearer guard and
     * workspace/verified-Pro checks still run before every invocation.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            ...parent::toArray(),
            'securitySchemes' => [
                ['type' => 'oauth2', 'scopes' => ['mcp:use']],
            ],
        ];
    }

    public function handle(Request $request): Response
    {
        $grant = request()->attributes->get(CreatorMcpOAuthRemoteSecurity::GRANT_ATTRIBUTE);
        if (
            ! is_array($grant)
            || ! is_int($grant['creator_id'] ?? null)
            || ! is_string($grant['connection_id'] ?? null)
            || ! is_string($grant['client_id'] ?? null)
        ) {
            return Response::error('MCP authorization required.');
        }

        $creator = User::query()->find($grant['creator_id']);
        if (! $creator instanceof User) {
            return Response::error('MCP authorization required.');
        }

        // The gateway *again* checks the stored consent, membership and Pro
        // when executing; the initial HTTP check is not a permanent grant.
        $result = app(CreatorMcpToolGateway::class)->invoke(
            $creator,
            $grant['connection_id'],
            $grant['client_id'],
            $this->reportTool,
            $request->all(),
        );

        return Response::json($result);
    }
}
