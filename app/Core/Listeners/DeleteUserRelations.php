<?php

namespace App\Core\Listeners;

use App\CannedReplies\Models\CannedReply;
use App\Conversations\Agent\Actions\DeleteMultipleConversations;
use App\Conversations\Models\Conversation;
use App\Models\User;
use Common\Auth\Events\UsersDeleted;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DeleteUserRelations
{
    public function handle(UsersDeleted $event): void
    {
        $userIds = $event->users->pluck('id');

        if (Schema::hasTable('emails')) {
            DB::table('emails')->whereIn('user_id', $userIds)->delete();
        }

        if (Schema::hasTable('user_details')) {
            DB::table('user_details')->whereIn('user_id', $userIds)->delete();
        }

        if (Schema::hasTable('purchase_codes')) {
            DB::table('purchase_codes')->whereIn('user_id', $userIds)->delete();
        }

        $conversationIds = Conversation::query()
            ->whereIn('user_id', $userIds)
            ->pluck('id');
        if ($conversationIds->isNotEmpty()) {
            (new DeleteMultipleConversations())->execute($conversationIds);
        }

        if (Schema::hasTable('canned_replies')) {
            CannedReply::query()->whereIn('user_id', $userIds)->delete();
        }

        if (Schema::hasTable('taggables')) {
            DB::table('taggables')
                ->whereIn('taggable_id', $userIds)
                ->where('taggable_type', User::MODEL_TYPE)
                ->delete();
        }

        if (Schema::hasTable('page_visits')) {
            DB::table('page_visits')->whereIn('user_id', $userIds)->delete();
        }
    }
}
