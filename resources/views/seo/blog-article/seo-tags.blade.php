<meta property="og:site_name" content="{{ settings('branding.site_name') }}" />
<meta property="twitter:card" content="summary" />
<meta property="og:type" content="article" />
<title>{{ $article['title'] }} - {{ settings('branding.site_name') }}</title>
<meta property="og:title" content="{{ $article['title'] }} - {{ settings('branding.site_name') }}" />
<meta property="og:url" content="{{ urls()->blogArticle($article) }}" />
<link rel="canonical" href="{{ urls()->blogArticle($article) }}" />

@php($description = $article['meta_description'] ?? $article['excerpt'] ?? null)
@if ($description)
    <meta property="og:description" content="{{ $description }}" />
    <meta name="description" content="{{ $description }}" />
    <meta name="twitter:description" content="{{ $description }}" />
@endif

@if ($article['cover_image'] ?? null)
    <meta property="og:image" content="{{ $article['cover_image'] }}" />
    <meta name="twitter:image" content="{{ $article['cover_image'] }}" />
    <meta property="twitter:card" content="summary_large_image" />
@elseif (settings('branding.social_image'))
    <meta property="og:image" content="{{ asset(settings('branding.social_image')) }}" />
    <meta name="twitter:image" content="{{ asset(settings('branding.social_image')) }}" />
    <meta property="twitter:card" content="summary_large_image" />
@endif

<meta property="article:published_time" content="{{ $article['published_at'] ?? $article['created_at'] }}" />
<meta property="article:modified_time" content="{{ $article['updated_at'] }}" />
@if ($article['category']['name'] ?? null)
    <meta property="article:section" content="{{ $article['category']['name'] }}" />
@endif
@if ($article['author']['name'] ?? null)
    <meta property="article:author" content="{{ $article['author']['name'] }}" />
@endif

<script type="application/ld+json">
{!! json_encode(array_filter([
    '@context' => 'https://schema.org',
    '@type' => 'BlogPosting',
    'headline' => $article['title'],
    'description' => $article['meta_description'] ?? $article['excerpt'],
    'image' => $article['cover_image'] ?? (settings('branding.social_image') ? asset(settings('branding.social_image')) : null),
    'datePublished' => $article['published_at'] ?? $article['created_at'],
    'dateModified' => $article['updated_at'],
    'author' => [
        '@type' => 'Person',
        'name' => $article['author']['name'] ?? settings('branding.site_name'),
    ],
    'publisher' => [
        '@type' => 'Organization',
        'name' => settings('branding.site_name'),
        'logo' => [
            '@type' => 'ImageObject',
            'url' => asset(settings('branding.logo_dark') ?? ''),
        ],
    ],
    'mainEntityOfPage' => [
        '@type' => 'WebPage',
        '@id' => urls()->blogArticle($article),
    ],
    'wordCount' => $article['reading_time_minutes'] ? $article['reading_time_minutes'] * 200 : null,
    'commentCount' => $article['comments_count'] ?? 0,
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}
</script>