<?php

namespace App\Conversations\Messages;

use Common\Files\FileEntry;
use Illuminate\Support\Arr;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

final class AuthorizeConversationAttachments
{
    /**
     * @param  array<int, int|array{id?: int}>  $attachments
     * @return list<int>
     */
    public function execute(?int $ownerUserId, array $attachments): array
    {
        $ids = array_values(array_unique(array_map(
            static function (int|array $attachment): int {
                return (int) (is_array($attachment)
                    ? Arr::get($attachment, 'id')
                    : $attachment);
            },
            $attachments,
        )));

        $ids = array_values(array_filter($ids, static fn (int $id): bool => $id > 0));

        if ($ids === []) {
            return [];
        }

        if ($ownerUserId === null) {
            throw new AccessDeniedHttpException(
                __('You are not allowed to attach these files.'),
            );
        }

        $ownedCount = FileEntry::query()
            ->whereOwner($ownerUserId)
            ->whereIn('id', $ids)
            ->count();

        if ($ownedCount !== count($ids)) {
            throw new AccessDeniedHttpException(
                __('You are not allowed to attach these files.'),
            );
        }

        return $ids;
    }
}
