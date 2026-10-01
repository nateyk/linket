@php($plainDescription = trim(preg_replace('/\s+/', ' ', strip_tags($data['product']['description'] ?? ''))))
@php($metaDescription = $plainDescription !== '' ? \Illuminate\Support\Str::limit($plainDescription, 160) : null)
<meta property="og:site_name" content="{{ settings('branding.site_name') }}" />
@if (!empty($data['product']['cover']['url']))
  <meta property="twitter:card" content="summary_large_image" />
@else
  <meta property="twitter:card" content="summary" />
@endif
<meta property="og:type" content="product" />
<title>{{ $data['product']['title'] }}</title>
<meta property="og:title" content="{{ $data['product']['title'] }}" />
<meta name="twitter:title" content="{{ $data['product']['title'] }}" />
<link rel="canonical" href="{{ url()->current() }}" />
<meta property="og:url" content="{{ url()->current() }}" />

@if ($metaDescription)
  <meta property="og:description" content="{{ $metaDescription }}" />
  <meta name="description" content="{{ $metaDescription }}" />
  <meta name="twitter:description" content="{{ $metaDescription }}" />
@endif

@if (!empty($data['product']['cover']['url']))
  <meta property="og:image" content="{{ $data['product']['cover']['url'] }}" />
  <meta name="twitter:image" content="{{ $data['product']['cover']['url'] }}" />
@endif

@php($schemaOfferPrice = number_format(($data['product']['price_cents'] ?? 0) / 100, 2, '.', ''))
<script type="application/ld+json">
{!! json_encode(array_filter([
    '@@context' => 'https://schema.org',
    '@type' => 'Product',
    'name' => $data['product']['title'],
    'description' => $metaDescription,
    'image' => $data['product']['cover']['url'] ?? null,
    'url' => url()->current(),
    'offers' => [
        '@type' => 'Offer',
        'price' => $schemaOfferPrice,
        'priceCurrency' => strtoupper((string) ($data['product']['currency'] ?? '')),
        'availability' => 'https://schema.org/InStock',
        'url' => url()->current(),
    ],
]), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}
</script>
