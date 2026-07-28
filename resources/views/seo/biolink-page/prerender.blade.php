@extends('common::prerender.base')

@section('head')
    @include('seo.biolink-page.seo-tags')
@endsection

@section('body')
    <h1>{{ $data['name'] }}</h1>

    <ul>
        @foreach ($data['content'] as $item)
            @if ($item['model_type'] === 'link')
              <li>
                <a href="{{ $item['short_url'] }}" target="_blank">
                  <div class="long-url">
                      <img
                          class="favicon-img"
                          src="{{ $item['image'] }}"
                          alt=""
                      />
                      <span>{{ $item['long_url'] }}</span>
                  </div>
                  <div class="short-url">{{ $item['short_url'] }}</div>
                  @if ($item['description'])
                      <p class="link-description">
                          {{ $item['description'] }}
                      </p>
                  @endif
                </a>
              </li>
            @elseif ($item['model_type'] === 'widget')
              @if ($item['type'] === 'text')
                <div class="text-widget">
                  <h2>{{ $item['config']['title'] }}</h2>
                  <p>{{ $item['config']['description'] }}</p>
                </div>
              @endif
            @endif
        @endforeach
    </ul>

    @foreach ($data['pixels'] ?? [] as $pixel)
      @include("pixels.{$pixel['type']}", ['pixel' => $pixel])
    @endforeach
@endsection
