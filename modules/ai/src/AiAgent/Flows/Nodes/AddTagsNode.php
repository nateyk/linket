<?php

namespace Ai\AiAgent\Flows\Nodes;

use Common\Tags\Tag;

class AddTagsNode extends BaseNode
{
    public function execute(): bool
    {
        $conversationTags = $this->data['conversationTags'] ?? [];
        $conversationTagIds = [];
        $userTags = $this->data['userTags'] ?? [];
        $userTagIds = [];
        $allTags = array_merge($conversationTags, $userTags);

        if (!empty($allTags)) {
            $tagIds = Tag::whereIn('name', $allTags)
                ->pluck('id', 'name')
                ->toArray();

            foreach ($tagIds as $name => $id) {
                if (in_array($name, $conversationTags)) {
                    $conversationTagIds[] = $id;
                }
                if (in_array($name, $userTags)) {
                    $userTagIds[] = $id;
                }
            }

            if (!empty($conversationTagIds)) {
                $this->executor->conversation
                    ->tags()
                    ->syncWithoutDetaching($conversationTagIds);
            }

            if (!empty($userTagIds)) {
                $this->executor->user
                    ->tags()
                    ->syncWithoutDetaching($userTagIds);
            }
        }

        $childId = $this->getDirectChildId();

        if ($childId) {
            $this->executor->goToNode($childId);
        }

        return true;
    }
}
