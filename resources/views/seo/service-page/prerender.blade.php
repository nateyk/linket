@extends('common::prerender.base')

@section('head')
    {!! $seoTags !!}
@endsection

@section('body')
    <h1>{{ $data['service']['title'] ?? '' }}</h1>

    @if (($data['service']['short_description'] ?? '') !== '')
        <p>{{ $data['service']['short_description'] }}</p>
    @endif

    @isset ($data['service']['cover']['url'])
        <img src="{{ $data['service']['cover']['url'] }}" alt="{{ $data['service']['title'] ?? '' }}" />
    @endisset

    @if (($data['service']['starting_price_cents'] ?? null) !== null)
        <p>
            {{ number_format($data['service']['starting_price_cents'] / 100, 2) }}
            {{ strtoupper((string) ($data['service']['currency'] ?? '')) }}
        </p>
    @endif

    @foreach ($data['service']['packages'] ?? [] as $package)
        <h2>{{ $package['name'] }}</h2>
        @if (($package['description'] ?? '') !== '')
            <p>{{ $package['description'] }}</p>
        @endif
    @endforeach

    <p>{{ $data['store']['name'] ?? '' }}</p>

    <a href="{{ url()->current() }}">
        {{ __('View service') }}
    </a>
@endsection