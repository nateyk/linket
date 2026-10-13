@extends('common::prerender.base')

@section('head')
    {!! $seoTags !!}
@endsection

@section('body')
    <article>
        <header>
            <h1>{{ $data['article']['title'] }}</h1>
            <div class="meta">
                <time datetime="{{ $data['article']['published_at'] ?? $data['article']['created_at'] }}">
                    {{ $data['article']['published_at'] ?? $data['article']['created_at'] }}
                </time>
                @isset ($data['article']['category']['name'])
                    <span class="category">{{ $data['article']['category']['name'] }}</span>
                @endisset
                @isset ($data['article']['author']['name'])
                    <span class="author">{{ $data['article']['author']['name'] }}</span>
                @endisset
                <span class="reading-time">{{ $data['article']['reading_time_minutes'] ?? 1 }} min read</span>
            </div>
        </header>
        
        @isset ($data['article']['cover_image'])
            <img src="{{ $data['article']['cover_image'] }}" alt="{{ $data['article']['title'] }}" />
        @endisset
        
        <div class="content">
            {!! $data['article']['body'] !!}
        </div>
    </article>
    
    @if (!empty($data['relatedArticles']['data']))
        <section class="related-articles">
            <h2>{{ __('Related Articles') }}</h2>
            <ul>
                @foreach ($data['relatedArticles']['data'] as $article)
                    <li>
                        <a href="{{ urls()->blogArticle($article) }}">{{ $article['title'] }}</a>
                    </li>
                @endforeach
            </ul>
        </section>
    @endif
@endsection