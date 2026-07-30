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
                'accept' => ['application/pdf', 'application/zip', 'text/plain', 'application/epub+zip'],
                'max_file_size' => '104857600', // 100mb; the product plan limit is enforced when it is attached.
            ],
        ],
    ],
];
