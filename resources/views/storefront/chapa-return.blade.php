<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>{{ $confirmed ? __('Payment confirmed') : __('Payment confirmation pending') }} · {{ config('app.name', 'Linket') }}</title>
    <style>
        :root { color-scheme: light dark; }
        *, *::before, *::after { box-sizing: border-box; }
        body {
            margin: 0; min-height: 100dvh; display: grid; place-items: center;
            padding: 24px; font: 16px/1.6 ui-sans-serif, system-ui, sans-serif;
            background: Canvas; color: CanvasText;
        }
        main { width: min(100%, 460px); }
        .surface { border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 20px; padding: clamp(20px, 6vw, 32px); }
        .eyebrow { font-size: 13px; font-weight: 600; margin: 0 0 8px; }
        h1 { font-size: clamp(22px, 4vw, 28px); line-height: 1.25; margin: 0 0 12px; }
        p { margin: 0 0 20px; }
        a.primary { display: block; min-height: 48px; padding: 11px 18px; text-align: center;
            border-radius: 12px; text-decoration: none; background: #1555c0; color: #fff; font-weight: 600; }
        a.primary:hover, a.primary:focus-visible { background: #084395; }
        a.primary:focus-visible { outline: 3px solid #80adff; outline-offset: 3px; }
        .help { font-size: 14px; opacity: .8; margin: 18px 0 0; }
    </style>
</head>
<body>
<main>
    <div class="surface" role="status">
        <p class="eyebrow">{{ config('app.name', 'Linket') }} · {{ __('Order status') }}</p>
        @if ($confirmed)
            <h1>{{ __('Payment confirmed') }}</h1>
            <p>{{ __('We have confirmed your payment. Sign in with the same email you used at checkout to access your purchase.') }}</p>
        @else
            <h1>{{ __('Payment confirmation pending') }}</h1>
            <p>{{ __('We cannot confirm your payment yet. Bank and wallet confirmations can take time. Do not pay again for the same order.') }}</p>
        @endif
        <a class="primary" href="{{ url('/my-portal') }}">{{ __('Open My Purchases') }}</a>
        <p class="help">{{ __('If you do not see your purchase yet, return later and use the email from checkout to recover your order.') }}</p>
    </div>
</main>
</body>
</html>
