<?php

return [
    'upload_types' => [
        'linkImages' => [
            'visibility' => 'public',
            'dont_clean' => true,
            'label' => 'Link images',
            'description' => 'Link and link in bio images uploaded by users.',
            'defaults' => [
                'prefix' => 'link-images',
                'accept' => ['image'],
                'max_file_size' => '2097152', //2mb
            ],
        ],
        'digitalProductFiles' => [
            'visibility' => 'private',
            'dont_clean' => true,
            'label' => 'Digital product files',
            'description' => 'Downloadable files uploaded by digital product creators.',
            'defaults' => [
                'prefix' => 'digital-products',
                // Derived from the single source of truth — do not hardcode a separate list here.
                // See App\Storefront\ProductFileFormats::uploadMimes().
                'accept' => \App\Storefront\ProductFileFormats::uploadMimes(),
                'max_file_size' => '104857600', // 100mb; the product plan limit is enforced when it is attached.
            ],
        ],
        'courseVideos' => [
            'visibility' => 'private',
            'dont_clean' => true,
            'label' => 'Course lesson videos',
            'description' => 'Private videos uploaded for course lessons.',
            'defaults' => [
                'prefix' => 'course-videos',
                'accept' => ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mpeg', 'video/x-matroska'],
                'max_file_size' => '536870912', // 512MB; plan entitlement enforces actual.
            ],
        ],
        'courseResources' => [
            'visibility' => 'private',
            'dont_clean' => true,
            'label' => 'Course lesson resources',
            'description' => 'Resource files attached to lessons.',
            'defaults' => [
                'prefix' => 'course-resources',
                'accept' => ['application/pdf', 'application/zip', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/csv', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'],
                'max_file_size' => '104857600',
            ],
        ],
    ],
];
