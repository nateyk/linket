<meta property="og:site_name" content="{{ settings('branding.site_name') }}" />
<meta property="twitter:card" content="summary" />
<meta property="og:type" content="product" />
<title>{{ $data['product']['title'] }}</title>
<meta property="og:title" content="{{ $data['product']['title'] }}" />

@if (!empty($data['product']['description']))
  <meta property="og:description" content="{{ $data['product']['description'] }}" />
  <meta name="description" content="{{ $data['product']['description'] }}" />
@endif

@if (!empty($data['product']['cover']['url']))
  <meta property="og:image" content="{{ $data['product']['cover']['url'] }}" />
@endif
