@extends('common::prerender.base')

@section('head')
    {!! $seoTags !!}
@endsection

@section('body')
    <h1>{{ $data['category']['name'] }}</h1>
    
    @isset ($data['category']['description'])
        <p>{{ $data['category']['description'] }}</p>
    @endisset
    
    @if (!empty($data['articles']['data']))
        <ul>
            @foreach ($data['articles']['data'] as $article)
                <li>
                    <h2><a href="{{ urls()->blogArticle($article) }}">{{ $article['title'] }}</a></h2>
                    <p>{{ $article['excerpt'] }}</p>
                    <small>Published: {{ $article['published_at'] }}</small>
                </li>
            @endforeach
        </ul>
        
        @if ($data['pagination']['last_page'] > 1)
            <nav>
                @for ($i = 1; $i <= $data['pagination']['last_page']; $i++)
                    <a href="{{ urls()->blogCategory($data['category']) }}?page={{ $i }}">{{ $i }}</a>
                @endfor
            </nav>
        @endif
    @else
        <p>{{ __('No articles found in this category.') }}</p>
    @endif
@endsection