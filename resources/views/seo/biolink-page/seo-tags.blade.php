<meta property="og:site_name" content="{{ settings('branding.site_name') }}" />
<meta property="twitter:card" content="summary" />
<meta property="og:type" content="website" />
<title>{{ $data['name'] }}</title>
<meta property="og:title" content="{{ $data['name'] }}" />

@isset ($data['image'])
    <meta property="og:image" content="{{ $data['image'] }}" />
@endisset

@isset ($data['description'])
  <meta property="og:description" content="{{ $data['description'] }}" />
  <meta name="description" content="{{ $data['description'] }}" />
@endisset
