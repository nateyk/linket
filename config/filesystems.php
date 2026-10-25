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
        'conversationImages' => [
            'visibility' => 'private',
            'dont_clean' => true,
            'label' => 'Conversation inline images',
            'description' => 'Images embedded in support conversation messages.',
            'defaults' => [
                'prefix' => 'conversation-images',
                'accept' => ['image'],
                'max_file_size' => '10485760', // 10MB
            ],
        ],
        'articleAttachments' => [
            'visibility' => 'private',
            'dont_clean' => true,
            'label' => 'Help center article attachments',
            'description' => 'Files attached to help center articles.',
            'defaults' => [
                'prefix' => 'article-attachments',
                'accept' => ['*'],
                'max_file_size' => '31457280', // 30MB
            ],
        ],
        'aiAgentFlowAttachments' => [
            'visibility' => 'private',
            'dont_clean' => true,
            'label' => 'AI agent flow attachments',
            'description' => 'Files attached to AI agent flow nodes.',
            'defaults' => [
                'prefix' => 'ai-agent-flow-attachments',
                'accept' => ['*'],
                'max_file_size' => '31457280', // 30MB
            ],
        ],
        'aiAgentDocuments' => [
            'visibility' => 'private',
            'dont_clean' => true,
            'label' => 'AI agent knowledge documents',
            'description' => 'Documents ingested into the AI agent knowledge base.',
            'defaults' => [
                'prefix' => 'ai-agent-documents',
                'accept' => ['*'],
                'max_file_size' => '104857600', // 100MB
            ],
        ],
        'chatWidgetUploads' => [
            'visibility' => 'private',
            'dont_clean' => true,
            'label' => 'Live chat widget uploads',
            'description' => 'Files uploaded by customers in the chat widget.',
            'defaults' => [
                'prefix' => 'chat-widget-uploads',
                'accept' => ['*'],
                'max_file_size' => '5242880', // 5MB
            ],
        ],
    ],
];
