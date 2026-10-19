@extends('common::prerender.base')

@section('head')
    {!! $seoTags !!}
@endsection

@section('body')
    <h1>{{ __('Services') }} — {{ $data['store']['name'] ?? '' }}</h1>

    @foreach ($data['services'] ?? [] as $service)
        <article>
            <h2>{{ $service['title'] ?? '' }}</h2>

            @if (($service['short_description'] ?? '') !== '')
                <p>{{ $service['short_description'] }}</p>
            @endif

            @isset ($service['cover']['url'])
                <img src="{{ $service['cover']['url'] }}" alt="{{ $service['title'] ?? '' }}" />
            @endisset

            @if (($service['starting_price_cents'] ?? null) !== null)
                <p>
                    {{ number_format($service['starting_price_cents'] / 100, 2) }}
                    {{ strtoupper((string) ($service['currency'] ?? '')) }}
                </p>
            @endif

            <a href="{{ $service['public_url'] ?? '' }}">
                {{ __('View service') }}
            </a>
        </article>
    @endforeach
@endsection