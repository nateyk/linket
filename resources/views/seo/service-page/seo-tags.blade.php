@php($service = $data['service'] ?? [])
@php($plainDescription = trim(preg_replace('/\s+/', ' ', strip_tags($service['short_description'] ?? $service['description'] ?? ''))))
@php($metaDescription = $plainDescription !== '' ? \Illuminate\Support\Str::limit($plainDescription, 160) : null)
@php($storeName = $data['store']['name'] ?? '')
<meta property="og:site_name" content="{{ settings('branding.site_name') }}" />
@if (!empty($service['cover']['url']))
  <meta property="twitter:card" content="summary_large_image" />
@else
  <meta property="twitter:card" content="summary" />
@endif
<meta property="og:type" content="website" />
<title>{{ $service['title'] ?? '' }} — {{ $storeName }}</title>
<meta property="og:title" content="{{ $service['title'] ?? '' }}" />
<meta name="twitter:title" content="{{ $service['title'] ?? '' }}" />
<link rel="canonical" href="{{ url()->current() }}" />
<meta property="og:url" content="{{ url()->current() }}" />

@if ($metaDescription)
  <meta property="og:description" content="{{ $metaDescription }}" />
  <meta name="description" content="{{ $metaDescription }}" />
  <meta name="twitter:description" content="{{ $metaDescription }}" />
@endif

@if (!empty($service['cover']['url']))
  <meta property="og:image" content="{{ $service['cover']['url'] }}" />
  <meta name="twitter:image" content="{{ $service['cover']['url'] }}" />
@endif

{{-- A service is an offer a visitor negotiates off-platform, so the schema
     advertises the provider and the price band, never a purchasable offer. --}}
<script type="application/ld+json">
{!! json_encode(array_filter([
    '@@context' => 'https://schema.org',
    '@type' => 'Service',
    'name' => $service['title'] ?? null,
    'description' => $metaDescription,
    'image' => $service['cover']['url'] ?? null,
    'url' => url()->current(),
    'serviceType' => $service['category'] ?? null,
    'provider' => [
        '@type' => 'Organization',
        'name' => $storeName,
        'url' => $data['back_url'] ?? null,
    ],
]), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}
</script>