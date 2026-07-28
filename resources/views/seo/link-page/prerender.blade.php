@extends('common::prerender.base')

@section('head')
    {!! $seoTags !!}
@endsection

@section('body')
    <h1>{{ $data['name'] }}</h1>
    <p>{{ $data['description'] }}</p>

    @isset ($data['image'])
        <img src="{{ $data['image'] }}" alt="" />
    @endisset

    @if ($data['type'] === 'page' && $data['link_page'])
        <article>
            {!! $data['link_page']['body'] !!}
        </article>
    @elseif ($data['type'] === 'overlay' && $data['overlay'])
        <section>
            <div class="message">{{ $data['overlay']['message'] }}</div>
            @if ($btnText = $data['overlay']['btn_text'])
                <a
                    class="main-button"
                    href="{{ $data['overlay']['btn_link'] }}"
                >
                    {{ $btnText }}
                </a>
            @endif

            <div class="ribbon-wrapper">
                <div class="ribbon">{{ $data['overlay']['label'] }}</div>
            </div>
        </section>
    @endif

    <a href="{{ $data['long_url'] }}">
        {{ __('Go to Link') }}
    </a>

    @foreach ($data['pixels'] ?? [] as $pixel)
      @include("pixels.{$pixel['type']}", ['pixel' => $pixel])
    @endforeach
@endsection
