<?php

namespace App\Demo;

use App\Conversations\Models\Conversation;
use App\Models\User;
use Common\Files\Actions\CreateFileEntry;
use Common\Files\Actions\StoreFile;
use Common\Files\FileEntry;
use Common\Files\FileEntryPayload;
use Illuminate\Support\Facades\Auth;

class CreateDemoAttachments
{
    public function execute()
    {
        $uploadType = Conversation::ATTACHMENT_UPLOAD_TYPE;
        if (
            ! \Common\Files\Uploads\Uploads::type($uploadType) ||
            FileEntry::where('upload_type', $uploadType)->exists()
        ) {
            return;
        }

        $owner =
            User::where('email', 'admin@admin.com')->first() ??
            User::where('email', 'agent@demo.com')->first() ??
            User::query()->orderBy('id')->first();

        if (! $owner) {
            return;
        }

        Auth::login($owner);

        $data = [
            [
                'clientName' => 'image-1.jpg',
                'clientSize' => '125646',
                'clientMime' => 'image/jpeg',
                'extension' => 'jpg',
                'type' => 'image',
            ],
            [
                'clientName' => 'doc-1.xls',
                'clientSize' => '56832',
                'clientMime' => 'application/vnd.ms-excel',
                'extension' => 'xls',
                'type' => 'spreadsheet',
            ],
            [
                'clientName' => 'audio-1.mp3',
                'clientSize' => '1939540',
                'clientMime' => 'audio/mpeg',
                'extension' => 'mp3',
                'type' => 'audio',
            ],
            [
                'clientName' => 'image-2.jpg',
                'clientSize' => '42657',
                'clientMime' => 'image/jpeg',
                'extension' => 'jpg',
                'type' => 'image',
            ],
            [
                'clientName' => 'doc-2.pptx',
                'clientSize' => '413895',
                'clientMime' =>
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'extension' => 'pptx',
                'type' => 'powerPoint',
            ],
            [
                'clientName' => 'video-1.mp4',
                'clientSize' => '1173924',
                'clientMime' => 'video/mp4',
                'extension' => 'mp4',
                'type' => 'video',
            ],
            [
                'clientName' => 'image-3.jpg',
                'clientSize' => '53205',
                'clientMime' => 'image/jpeg',
                'extension' => 'jpg',
                'type' => 'image',
            ],
            [
                'clientName' => 'doc-3.doc',
                'clientSize' => '71680',
                'clientMime' => 'application/msword',
                'extension' => 'doc',
                'type' => 'word',
            ],
        ];

        foreach ($data as $item) {
            $path = public_path('demo-files/' . $item['clientName']);
            $contents = is_file($path)
                ? file_get_contents($path)
                : $this->placeholderContents($item['clientMime']);

            $payload = new FileEntryPayload([
                ...$item,
                'clientSize' => (string) strlen($contents),
                'uploadType' => $uploadType,
                'ownerId' => $owner->id,
                'workspaceId' => 0,
            ]);

            (new StoreFile())->execute($payload, [
                'contents' => $contents,
            ]);
            (new CreateFileEntry())->execute($payload);
        }

        Auth::logout();
    }

    /**
     * Minimal bytes when public/demo-files is not shipped with Linket.
     */
    protected function placeholderContents(string $mime): string
    {
        if (str_starts_with($mime, 'image/')) {
            // 1x1 JPEG
            return base64_decode(
                '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z',
            );
        }

        return "demo-attachment\n";
    }
}
