<meta property="og:site_name" content="{{ settings('branding.site_name') }}" />
<meta property="twitter:card" content="summary" />
<meta property="og:type" content="website" />
<title>{{ $data['title'] }} - {{ settings('branding.site_name') }}</title>
<meta
    property="og:title"
    content="{{ $data['title'] }} - {{ settings('branding.site_name') }}"
/>
<meta property="og:url" content="{{ urls()->customPage($data) }}" />
<link rel="canonical" href="{{ urls()->customPage($data) }}" />

@isset ($data['description'])
    <meta property="og:description" content="{{ $data['description'] }}" />
    <meta name="description" content="{{ $data['description'] }}" />
@endisset
