@php($services = $data['services'] ?? [])
@php($storeName = $data['store']['name'] ?? '')
@php($titles = collect($services)->map(fn ($service) => $service['title'] ?? null)->filter()->all())
@php($plainDescription = trim(collect($services)->map(fn ($service) => strip_tags($service['short_description'] ?? ''))->filter()->implode('. ')))
@php($metaDescription = $plainDescription !== '' ? \Illuminate\Support\Str::limit($plainDescription, 160) : null)
@php($cover = collect($services)->map(fn ($service) => $service['cover']['url'] ?? null)->filter()->first())
<meta property="og:site_name" content="{{ settings('branding.site_name') }}" />
<meta property="og:type" content="website" />
<title>{{ __('Services') }} — {{ $storeName }}</title>
<meta property="og:title" content="{{ __('Services') }} — {{ $storeName }}" />
<meta name="twitter:title" content="{{ __('Services') }} — {{ $storeName }}" />
<link rel="canonical" href="{{ url()->current() }}" />
<meta property="og:url" content="{{ url()->current() }}" />

@if ($metaDescription)
  <meta property="og:description" content="{{ $metaDescription }}" />
  <meta name="description" content="{{ $metaDescription }}" />
@endif

@if ($cover)
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="og:image" content="{{ $cover }}" />
@endif

<script type="application/ld+json">
{!! json_encode(array_filter([
    '@@context' => 'https://schema.org',
    '@type' => 'CollectionPage',
    'name' => __('Services').' — '.$storeName,
    'description' => $metaDescription,
    'url' => url()->current(),
    'hasPart' => collect($services)->map(fn ($service) => array_filter([
        '@type' => 'Service',
        'name' => $service['title'] ?? null,
        'url' => $service['public_url'] ?? null,
        'serviceType' => $service['category'] ?? null,
    ]))->values()->all(),
]), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}
</script>