<?php

namespace Ai\AiAgent\Flows\Nodes;

use Ai\AiAgent\Flows\MessageBuilderData;
use Ai\AiAgent\Variables\VariableReplacer;
use App\Core\UrlGenerator;
use App\HelpCenter\Models\HcArticle;
use Illuminate\Support\Facades\DB;

class ArticlesNode extends BaseNode
{
    public static $canUseAsGreetingNode = true;

    public static function buildConversationMessagesData(
        MessageBuilderData $data,
    ): array {
        $articleIds = $data->nodeConfig['data']['articleIds'] ?? [];
        $messageContent = $data->nodeConfig['data']['message'] ?? null;
        $messages = [];

        if ($messageContent) {
            $messages[] = [
                'type' => 'message',
                'body' => (new VariableReplacer(
                    $data->toVariableReplacerData(),
                ))->execute($messageContent),
                'attachments' =>
                    $data->nodeConfig['data']['attachmentIds'] ?? [],
            ];
        }

        if (!empty($articleIds)) {
            $articles = HcArticle::whereIn('id', $articleIds)
                ->select([
                    'id',
                    'title',
                    DB::raw('substring(body, 1, 200) as body'),
                ])
                ->get();

            $messages[] = [
                'type' => 'cards',
                'body' => [
                    'items' => $articles->map(
                        fn(HcArticle $article) => [
                            'title' => $article->title,
                            'description' => strip_tags($article->body),
                            'buttons' => [
                                [
                                    'name' => 'View article',
                                    'actionType' => 'openUrl',
                                    'actionValue' => (new UrlGenerator())->article(
                                        $article,
                                    ),
                                ],
                            ],
                        ],
                    ),
                ],
            ];
        }

        return $messages;
    }

    public function execute(): bool
    {
        $messages = self::buildConversationMessagesData(
            new MessageBuilderData(
                nodeConfig: $this->config,
                allNodes: $this->executor->sessionContext->getAllNodes(),
                conversation: $this->executor->conversation,
                user: $this->executor->user,
                session: $this->executor->sessionContext->getSession(),
            ),
        );

        foreach ($messages as $messageData) {
            $this->createConversationMessage($messageData);
        }

        $childId = $this->getDirectChildId();

        if ($childId) {
            $this->executor->goToNode($childId);
        }

        return true;
    }
}
