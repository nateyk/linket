@php
    $homepageTitle = settings('branding.site_name') . ' - Digital Products for Ethiopian Creators';
    $homepageDescription = 'Create your storefront, sell digital products, and receive payments directly through Ethiopian banks and wallets with ' . settings('branding.site_name') . '.';
    $socialImage = settings('branding.social_image');
@endphp

<meta property="og:site_name" content="{{ settings('branding.site_name') }}" />
<meta property="og:type" content="website" />
<title>{{ $homepageTitle }}</title>
<meta property="og:title" content="{{ $homepageTitle }}" />
<meta name="twitter:title" content="{{ $homepageTitle }}" />
<meta property="og:url" content="{{ urls()->home() }}" />
<link rel="canonical" href="{{ urls()->home() }}" />

<meta property="og:description" content="{{ $homepageDescription }}" />
<meta name="description" content="{{ $homepageDescription }}" />
<meta name="twitter:description" content="{{ $homepageDescription }}" />

@if ($socialImage)
    <meta property="og:image" content="{{ asset($socialImage) }}" />
    <meta name="twitter:image" content="{{ asset($socialImage) }}" />
    <meta name="twitter:card" content="summary_large_image" />
@else
    <meta name="twitter:card" content="summary" />
@endif
