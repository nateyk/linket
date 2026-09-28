<?php
$buttonClass =
    'py-2 px-4 bg-primary font-semibold text-primary-foreground rounded-sm shadow-sm'; ?>

<!DOCTYPE html>
<html class="light">
<head>
    <title>Install</title>
    <link href="{{ getMainCssFileUrl() }}" rel="stylesheet" />

    <style>
        .light {
            {{
                collect(config('themes.light'))
                    ->mapWithKeys(fn($value, $key) => [$key => $value])
                    ->map(fn($value, $key) => "$key: $value;")
                    ->implode('')
            }}
        }
    </style>
</head>
<body
    class="bg-muted text-foreground flex flex-col items-center justify-center"
>
    <div class="mb-8.5 flex items-center gap-2.5">
        <img
            src="{{ file_exists(public_path('images/logo-dark.png')) ? asset('images/logo-dark.png') : asset('images/logo-dark.svg') }}"
            alt=""
            class="block h-10 w-auto"
        />
        <span class="text-2xl font-semibold tracking-tight">Linket</span>
    </div>
    <div class="bg-background w-195 rounded-md border p-6 shadow-sm">{{ $slot }}</div>
</body>
</html>
