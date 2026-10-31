<?php

namespace App\Conversations\Policies;

use App\Conversations\Models\Conversation;
use App\Conversations\Models\ConversationItem;
use App\Models\User;
use Common\Core\Policies\FileEntryPolicy;
use Common\Files\FileEntry;
use Illuminate\Support\Facades\DB;

class ConversationFileEntryPolicy extends FileEntryPolicy
{
    public function show(?User $user, FileEntry $entry): bool
    {
        if (!$user) {
            return false;
        }
        return $this->hasPermissionViaConversation($user, $entry);
    }

    public function download(?User $user, $entries): bool
    {
        if (!$user) {
            return false;
        }
        return $this->hasPermissionViaConversation($user, $entries[0]);
    }

    private function hasPermissionViaConversation(
        User $user,
        FileEntry $entry,
    ): bool {
        $values = DB::table('file_entry_models')
            ->where('file_entry_id', $entry->id)
            ->get();

        foreach ($values as $value) {
            if (
                $value->model_type === User::MODEL_TYPE &&
                $value->model_id === $user->id
            ) {
                return true;
            }

            if ($value->model_type !== ConversationItem::MODEL_TYPE) {
                continue;
            }

            $conversationId = ConversationItem::query()
                ->where('id', $value->model_id)
                ->value('conversation_id');

            $conversation = Conversation::find($conversationId);

            // Ticket participant, support owner, or platform agent with show access.
            if ($conversation && $user->can('show', $conversation)) {
                return true;
            }
        }

        return false;
    }
}
