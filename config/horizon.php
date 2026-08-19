<?php

use Illuminate\Support\Str;

return array_replace_recursive(
    require base_path('vendor/laravel/horizon/config/horizon.php'),
    [
        'name' => env('HORIZON_NAME', env('APP_NAME', 'Linket')),
        'prefix' => env(
            'HORIZON_PREFIX',
            Str::slug(env('APP_NAME', 'linket'), '_') . '_horizon:',
        ),
        'waits' => [
            'redis:default' => 60,
            'redis:mail' => 60,
        ],
        'fast_termination' => true,
        'defaults' => [
            'supervisor-1' => [
                'connection' => 'redis',
                'queue' => ['mail', 'default'],
                'balance' => 'auto',
                'autoScalingStrategy' => 'time',
                'maxProcesses' => 1,
                'maxTime' => 0,
                'maxJobs' => 0,
                'memory' => 128,
                'tries' => 3,
                'timeout' => 90,
                'nice' => 0,
            ],
        ],
        'environments' => [
            'production' => [
                'supervisor-1' => [
                    'maxProcesses' => 5,
                    'balanceMaxShift' => 1,
                    'balanceCooldown' => 3,
                ],
            ],
            'local' => [
                'supervisor-1' => [
                    'maxProcesses' => 3,
                ],
            ],
        ],
    ],
);
