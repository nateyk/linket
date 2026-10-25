<?php

namespace Ai\Controllers;

use Ai\AiAgent\Ingest\Web\WebsiteIngester;
use Ai\AiAgent\Models\AiAgentWebpage;
use Ai\AiAgent\Models\AiAgentWebsite;
use Common\Core\BaseController;
use Common\Database\Datasource\Datasource;
use Illuminate\Support\Facades\DB;

class AiAgentWebsiteController extends BaseController
{
    public function index()
    {
        $this->authorize('update', 'aiAgent');

        $datasource = new Datasource(AiAgentWebsite::query(), request()->all());

        return $this->success([
            'pagination' => $datasource->paginate(),
        ]);
    }

    public function indexPages(int $websiteId)
    {
        $this->authorize('update', 'aiAgent');

        $website = AiAgentWebsite::findOrFail($websiteId);

        $datasource = new Datasource(
            $website->webpages()->selectAllExceptContent(),
            request()->all(),
        );

        return $this->success([
            'pagination' => $datasource->paginate(),
            'website' => $website,
        ]);
    }

    public function showPage(int $websiteId, int $webpageId)
    {
        $this->authorize('update', 'aiAgent');

        $website = AiAgentWebsite::findOrFail($websiteId);
        $webpage = $website->webpages()->findOrFail($webpageId);

        return $this->success([
            'website' => $website,
            'webpage' => $webpage,
        ]);
    }

    public function store()
    {
        $this->authorize('update', 'aiAgent');

        $data = $this->validate(request(), [
            'url' => 'required|url',
            'scanType' => 'in:full,nested,single',
            'scrapeConfig' => 'array',
        ]);

        (new WebsiteIngester())->startWebsiteIngest(
            $data['url'],
            $data['scanType'],
            $data['scrapeConfig'] ?? [],
        );

        return $this->success();
    }

    public function destroyWebsite(int $websiteId)
    {
        $this->authorize('update', 'aiAgent');

        $website = AiAgentWebsite::findOrFail($websiteId);

        DB::transaction(function () use ($website) {
            AiAgentWebpage::deleteMultiple($website->webpages()->pluck('id'));
            $website->delete();
        });

        return $this->success();
    }

    public function destroyPage(int $websiteId, string $webpageIds)
    {
        $this->authorize('update', 'aiAgent');

        $count = AiAgentWebpage::where(
            'ai_agent_website_id',
            $websiteId,
        )->count();

        if ($count === 1) {
            return $this->error('Website must have at least one page');
        }

        DB::transaction(function () use ($webpageIds) {
            AiAgentWebpage::deleteMultiple(explode(',', $webpageIds));
        });

        return $this->success();
    }

    public function syncPageContent(int $webpageId)
    {
        $this->authorize('update', 'aiAgent');

        $webpage = AiAgentWebpage::findOrFail($webpageId);

        (new WebsiteIngester())->syncExistingWebpage($webpage);

        return $this->success();
    }

    public function syncWebsite(int $websiteId)
    {
        $this->authorize('update', 'aiAgent');

        $website = AiAgentWebsite::findOrFail($websiteId);
        (new WebsiteIngester())->startWebsiteIngest(
            $website->url,
            $website->scan_type,
        );

        return $this->success();
    }
}
