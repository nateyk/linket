<?php namespace Ai\Controllers;

use App\Conversations\Models\Conversation;
use Common\AI\Llm;
use Common\AI\Requests\EnhanceTextRequest;
use Common\Core\BaseController;

class EnhanceTextWithAIController extends BaseController
{
    public function __invoke(EnhanceTextRequest $request)
    {
        $this->authorize('update', Conversation::class);

        $response = Llm::enhanceText($request->validated());

        return $this->success([
            'content' => $response->output,
        ]);
    }
}
