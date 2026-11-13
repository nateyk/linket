<?php

namespace App\HelpCenter\Controllers;

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcArticleFeedback;
use Common\Core\BaseController;
use Illuminate\Support\Facades\DB;

class HcArticleFeedbackController extends BaseController
{
    private const VISITOR_COOKIE = 'hc_feedback_visitor';

    public function store(HcArticle $article)
    {
        $this->authorize('show', $article);

        $data = $this->validate(request(), [
            'wasHelpful' => 'required|boolean',
            'comment' => 'nullable|string|min:1|max:1000',
        ]);

        $userId = request()->user()?->id;
        $visitorToken = null;
        $visitorHash = null;

        if (! $userId) {
            // IP addresses are shared by households, offices and mobile networks.
            // Keep a random browser token instead; never store the IP on new votes.
            $incomingToken = request()->cookie(self::VISITOR_COOKIE);
            $visitorToken = is_string($incomingToken) &&
                preg_match('/\A[a-f0-9]{64}\z/D', $incomingToken)
                    ? $incomingToken
                    : bin2hex(random_bytes(32));
            $visitorHash = hash_hmac('sha256', $visitorToken, config('app.key'));
        }

        DB::transaction(function () use ($article, $data, $userId, $visitorHash) {
            // Serialize votes on this article. This prevents concurrent first-time
            // requests from creating two votes before either can see the other.
            HcArticle::query()->whereKey($article->getKey())->lockForUpdate()->firstOrFail();
            $article->refresh();
            $this->authorize('show', $article);

            $identity = $userId
                ? ['user_id' => $userId]
                : ['visitor_token_hash' => $visitorHash];

            $feedback = $article->feedback()->firstOrNew($identity);
            $feedback->fill([
                'article_id' => $article->id,
                'user_id' => $userId,
                'visitor_token_hash' => $visitorHash,
                'was_helpful' => $data['wasHelpful'],
                'comment' => $data['comment'] ?? null,
                'ip' => null,
            ])->save();
        });

        $response = $this->success();

        if ($visitorToken) {
            $response->cookie(cookie(
                self::VISITOR_COOKIE,
                $visitorToken,
                60 * 24 * 365,
                '/',
                null,
                request()->isSecure(),
                true,
                false,
                'lax',
            ));
        }

        return $response;
    }
}
