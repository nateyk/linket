@extends('common::prerender.base')

@section('head')
    {!! $seoTags !!}
@endsection

@section('body')
    <h1>{{ $data['title'] ?? 'Blog' }}</h1>
    
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
                    <a href="{{ urls()->blogIndex() }}?page={{ $i }}">{{ $i }}</a>
                @endfor
            </nav>
        @endif
    @else
        <p>{{ __('No articles found.') }}</p>
    @endif
@endsection