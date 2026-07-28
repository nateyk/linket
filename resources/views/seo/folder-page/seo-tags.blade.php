<meta property="og:site_name" content="{{ settings('branding.site_name') }}" />
<meta property="twitter:card" content="summary" />
<meta property="og:type" content="website" />
<title>{{ $linkeable->name }}</title>
<meta property="og:title" content="{{ $linkeable->name }}" />

@if ($linkeable->image)
    <meta property="og:image" content="{{ $linkeable->image }}" />
@endif

@if($linkeable->description)
  <meta property="og:description" content="{{ $linkeable->description }}" />
  <meta name="description" content="{{ $linkeable->description }}" />
@endif
