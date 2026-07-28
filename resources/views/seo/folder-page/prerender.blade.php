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

    <ul>
        @foreach ($data['links'] as $link)
            <li>
              <a href="{{ $link['short_url'] }}" target="_blank">
                <div class="long-url">
                    <img
                        class="favicon-img"
                        src="{{ $link['image'] }}"
                        alt=""
                    />
                    <span>{{ $link['long_url'] }}</span>
                </div>
                <div class="short-url">{{ $link['short_url'] }}</div>
                @if ($link['description'])
                    <p class="link-description">
                        {{ $link['description'] }}
                    </p>
                @endif
              </a>
            </li>
        @endforeach
    </ul>

    @foreach ($data['pixels'] ?? [] as $pixel)
    @include("pixels.{$pixel['type']}", ['pixel' => $pixel])
@endforeach
@endsection
