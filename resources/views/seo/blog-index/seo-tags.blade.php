<meta property="og:site_name" content="{{ settings('branding.site_name') }}" />
<meta property="twitter:card" content="summary" />
<meta property="og:type" content="website" />
<title>{{ $title ?? 'Blog' }} - {{ settings('branding.site_name') }}</title>
<meta property="og:title" content="{{ $title ?? 'Blog' }} - {{ settings('branding.site_name') }}" />
<meta property="og:url" content="{{ urls()->blogIndex() }}" />
<link rel="canonical" href="{{ urls()->blogIndex() }}" />

@php($description = $description ?? null)
@if ($description)
    <meta property="og:description" content="{{ $description }}" />
    <meta name="description" content="{{ $description }}" />
    <meta name="twitter:description" content="{{ $description }}" />
@endif

@if ($cover_image ?? null)
    <meta property="og:image" content="{{ $cover_image }}" />
    <meta name="twitter:image" content="{{ $cover_image }}" />
    <meta property="twitter:card" content="summary_large_image" />
@elseif (settings('branding.social_image'))
    <meta property="og:image" content="{{ asset(settings('branding.social_image')) }}" />
    <meta name="twitter:image" content="{{ asset(settings('branding.social_image')) }}" />
    <meta property="twitter:card" content="summary_large_image" />
@endif