<?php
$cssVariables = collect(config('themes.light'))
    ->mapWithKeys(fn($value, $key) => [$key => $value])
    ->map(fn($value, $key) => "$key: $value;")
    ->implode(''); ?>

<!DOCTYPE html>
<html style="{{$cssVariables}}">
<head>
    <title>Custom domain connected</title>
    <link href="{{ getMainCssFileUrl() }}" rel="stylesheet" />
</head>
<body
    class="flex flex-col items-center justify-center bg-muted text-foreground"
>
    <img
        src="{{ file_exists(public_path('images/logo-dark.png')) ? asset('images/logo-dark.png') : asset('images/logo-dark.svg') }}"
        alt="Logo"
        class="mb-34 h-40"
    />
    <div class="w-680 max-w-full rounded-md border bg p-24 text-center shadow">
        {{ $content }}
    </div>
</body>
</html>
