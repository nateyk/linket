<?php

use App\Links\Models\Link;
use App\Folders\Models\Folder;
use App\LinkOverlays\Models\LinkOverlay;
use App\QrCodes\Models\QrCode;
use App\TrackingPixels\Models\TrackingPixel;

return [
    'meilisearch' => [
        Link::class => [
            'filter_only_fields' => [
                'id',
                'hash',
                'type',
                'disabled',
                'groups',
                'user_id',
                'created_at',
                'updated_at',
                'expires_at',
                'password',
                'workspace_id',
            ],
        ],
        Folder::class => [
            'filter_only_fields' => [
                'id',
                'user_id',
                'created_at',
                'updated_at',
                'public',
                'workspace_id',
                'rotator',
            ],
        ],
        LinkOverlay::class => [],
        TrackingPixel::class => [],
        QrCode::class => [],
    ],
];
