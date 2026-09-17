@extends('common::prerender.base')

@section('head')
    {!! $seoTags !!}
@endsection

@section('body')
    <h1>{{ $data['product']['title'] }}</h1>
    <p>{{ number_format(($data['product']['price_cents'] ?? 0) / 100, 2) }} {{ strtoupper((string) ($data['product']['currency'] ?? '')) }}</p>

    @php($plainDescription = trim(preg_replace('/\s+/', ' ', strip_tags($data['product']['description'] ?? ''))))
    @if ($plainDescription !== '')
        <p>{{ $plainDescription }}</p>
    @endif

    @isset ($data['product']['cover']['url'])
        <img src="{{ $data['product']['cover']['url'] }}" alt="{{ $data['product']['title'] }}" />
    @endisset

    <p>{{ $data['creator']['name'] ?? '' }}</p>

    <a href="{{ url()->current() }}">
        {{ __('View product') }}
    </a>
@endsection
