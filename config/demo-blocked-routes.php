<?php

return [
    // LINKS
    ['method' => 'DELETE', 'name' => 'link/{link}', 'origin' => 'admin'],
    ['method' => 'PUT', 'name' => 'link/{link}', 'origin' => 'admin'],

    // FOLDERS
    [
        'method' => 'DELETE',
        'name' => 'folder/{folder}',
        'origin' => 'admin',
    ],
    [
        'method' => 'PUT',
        'name' => 'folder/{folder}',
        'origin' => 'admin',
    ],

    // BIOLINKS
    [
        'method' => 'DELETE',
        'name' => 'biolink/{biolink}',
        'origin' => 'admin',
    ],
    [
        'method' => 'PUT',
        'name' => 'biolink/{biolink}',
        'origin' => 'admin',
    ],
    [
        'method' => 'PUT',
        'name' => 'biolink/{biolink}/content-item',
        'origin' => 'admin',
    ],
    [
        'method' => 'POST',
        'name' => 'biolink/{biolink}/content-item/detach',
        'origin' => 'admin',
    ],

    // LINK OVERLAYS
    ['method' => 'DELETE', 'name' => 'lo/bulk', 'origin' => 'admin'],
    ['method' => 'PUT', 'name' => 'lo/{id}', 'origin' => 'admin'],

    // TRACKING PIXELS
    ['method' => 'DELETE', 'name' => 'tp/{ids}', 'origin' => 'admin'],
    ['method' => 'PUT', 'name' => 'tp/{trackingPixel}', 'origin' => 'admin'],
];
