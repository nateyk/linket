@extends('common::prerender.base')

@section('head')
    {!! $seoTags !!}
@endsection

@section('body')
    <h1>{{ $data['title'] }}</h1>

    <main>
        {!! $data['body'] !!}
    </main>
@endsection
