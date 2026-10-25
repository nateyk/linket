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
                // 2 MiB (2097152). prettyBytes shows this as "2 MB".
                // Cropped images are encoded to WebP before this check.
                'max_file_size' => '2097152',
            ],
        ],
        'digitalProductSamples' => [
            'visibility' => 'private',
            'dont_clean' => true,
            'label' => 'Digital product previews',
            'description' => 'Buyer-facing audio clips and sample PDFs. Streamed only through short-lived signed URLs while the product is public. Caps: 8 audio clips at 20MB, or 1 PDF at 15MB. See App\Storefront\ProductSamplePolicy.',
            'defaults' => [
                'prefix' => 'digital-product-samples',
                'accept' => \App\Storefront\ProductSamplePolicy::uploadMimes(),
                // 20MB. PDF samples are tightened to 15MB in ProductSamplePolicy.
                'max_file_size' => '20971520',
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
        'conversationAttachments' => [
            'visibility' => 'private',
            'dont_clean' => true,
            'label' => 'Conversation attachments',
            'description' => 'Files attached to support conversation messages.',
            'defaults' => [
                'prefix' => 'conversation-attachments',
                'accept' => ['*'],
                'max_file_size' => '31457280', // 30MB
            ],
        ],
    ],
];
