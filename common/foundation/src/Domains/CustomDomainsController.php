<?php

namespace Common\Domains;

use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Common\Core\AppUrl;
use Common\Core\Demo\BlockedOnDemoSite;
use Common\Domains\CustomDomain;
use Common\Domains\Requests\SaveCustomDomainRequest;
use Common\Domains\Resources\CustomDomainResource;
use Exception;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use Common\API\ExcludeRouteFromPublicDocs;

/**
 * @tags Custom Domains
 */
class CustomDomainsController extends Controller
{
    const VALIDATE_CUSTOM_DOMAIN_PATH = 'secure/custom-domains/validate-dns/2BrM45vvfS/response';

    /**
     * List all custom domains.
     *
     * @operationId listCustomDomains
     */
    public function index(Request $request)
    {
        Gate::authorize('index', CustomDomain::class);

        $data = $request->validate([
            'query' => 'nullable|string',
            'per_page' => 'integer|min:1|max:100',
            'page' => 'integer|min:1',
            'include' => 'string',
            'workspace_id' => 'string',
            'created_at' => 'string',
            'updated_at' => 'string',
            'user_id' => 'integer',
            'global' => 'boolean',
            'host' => 'string',
            'is_archived' => 'string',
        ]);

        $pagination = (new CustomDomainsQueryBuilder($data))->paginate();

        return CustomDomainResource::collection($pagination);
    }

    /**
     * Retrieve a custom domain.
     *
     * @operationId retrieveCustomDomain
     */
    public function show(int $id)
    {
        $customDomain = CustomDomain::findOrFail($id);

        Gate::authorize('show', $customDomain);

        return new CustomDomainResource($customDomain);
    }

    /**
     * Create a custom domain.
     *
     * @operationId createCustomDomain
     */
    #[BlockedOnDemoSite]
    #[ExcludeRouteFromPublicDocs]
    public function store(SaveCustomDomainRequest $request)
    {
        Gate::authorize('store', CustomDomain::class);

        $data = $request->validated();

        $domain = CustomDomain::create([
            'host' => $data['host'],
            'user_id' => Auth::id(),
            'global' => $data['global'] ?? false,
        ]);

        return new CustomDomainResource($domain);
    }

    /**
     * Update a custom domain.
     *
     * @operationId updateCustomDomain
     */
    #[BlockedOnDemoSite]
    #[ExcludeRouteFromPublicDocs]
    public function update(int $id, SaveCustomDomainRequest $request)
    {
        $customDomain = CustomDomain::findOrFail($id);

        Gate::authorize('update', $customDomain);

        $data = $request->validated();

        $customDomain->update($data);

        return new CustomDomainResource($customDomain);
    }

    /**
     * Delete a custom domain.
     *
     * @operationId deleteCustomDomain
     */
    #[BlockedOnDemoSite]
    public function destroy(int $id)
    {
        $customDomain = CustomDomain::findOrFail($id);

        Gate::authorize('destroy', $customDomain);

        $customDomain->forceDelete();

        return response()->noContent();
    }

    /**
     * Archive a custom domain.
     *
     * @operationId archiveCustomDomain
     */
    #[BlockedOnDemoSite]
    public function archive(int $id)
    {
        $customDomain = CustomDomain::findOrFail($id);

        Gate::authorize('destroy', $customDomain);

        $customDomain->delete();

        return response()->noContent();
    }

    /**
     * Unarchive a custom domain.
     *
     * @operationId unarchiveCustomDomain
     */
    #[BlockedOnDemoSite]
    public function unarchive(int $id)
    {
        $customDomain = CustomDomain::onlyTrashed()->findOrFail($id);

        Gate::authorize('destroy', $customDomain);

        $customDomain->restore();

        return response()->noContent();
    }

    /**
     * Validate host.
     *
     * Run laravel's validation rules for store or update methods on specified host.
     */
    public function validateHost(SaveCustomDomainRequest $request)
    {
        Gate::authorize('store', CustomDomain::class);

        $data = $request->validated();

        // don't allow attaching current site url as custom domain
        if (app(AppUrl::class)->requestHostMatches($data['host'])) {
            throw ValidationException::withMessages([
                'host' => __(
                    "Current site url can't be attached as custom domain.",
                ),
            ]);
        }

        return response()->json([
            'server_ip' => $this->getServerIp(),
        ]);
    }

    /**
     * Validate the domain DNS.
     *
     * Check if specified domain is actually connected to the server via DNS records and if server is configured properly to handle requests from this domain.
     */
    public function validateDomainDns(SaveCustomDomainRequest $request)
    {
        $data = $request->validated();

        $failReason = '';

        try {
            $host = parse_url($data['host'], PHP_URL_HOST);
            $dns = dns_get_record($host ?? $data['host']);
        } catch (Exception $e) {
            $dns = [];
        }

        $recordWithIp = Arr::first($dns, fn($record) => isset($record['ip']));
        if (
            empty($dns) ||
            (isset($recordWithIp) &&
                $recordWithIp['ip'] !== $this->getServerIp())
        ) {
            $failReason = 'dnsNotSetup';
        }

        $host = trim($data['host'], '/');
        try {
            $response = Http::get(
                "$host/" . self::VALIDATE_CUSTOM_DOMAIN_PATH,
            )->json();
        } catch (ConnectionException $e) {
            $response = [];
            $failReason = 'serverNotConfigured';
        }

        if (Arr::get($response, 'result') === 'connected') {
            return $response;
        } else {
            $failReason = 'serverNotConfigured';
        }

        throw ValidationException::withMessages([
            'failReason' => $failReason,
        ]);
    }

    /**
     * Helper method for checking if server is configured properly to handle requests from domain.
     *
     */
    public function validateDomainDnsResponse()
    {
        return response()->json(['result' => 'connected']);
    }

    private function getServerIp(): string
    {
        return env('SERVER_IP') ??
            (env('SERVER_ADDR') ?? (env('LOCAL_ADDR') ?? env('REMOTE_ADDR')));
    }
}
