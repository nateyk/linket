<?php

namespace Ai\Controllers;

use Ai\AiAgent\Ingest\Web\WebsiteIngester;
use App\HelpCenter\Models\HcArticle;
use Common\Core\BaseController;

class AiAgentIngestController extends BaseController
{
    public function website()
    {
        $this->authorize('store', HcArticle::class);

        $data = $this->validate(request(), [
            'url' => 'required|url',
            'scanType' => 'in:full,nested,single',
        ]);

        (new WebsiteIngester())->startWebsiteIngest(
            $data['url'],
            $data['scanType'],
        );

        return $this->success();
    }
}
