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
    ],
];
