<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta property="og:title" content="{{ $data->name }}" />
        @if ($data->description)
            <meta
                property="og:description"
                content="{{ $data->description }}"
            />
        @endif

        @if ($data->image)
            <meta property="og:image" content="{{ $data->image }}" />
        @endif

        <title>{{ $data->name }}</title>

        @foreach ($data->getTrackingPixels() as $pixel)
            @include("pixels.{$pixel['type']}", ['pixel' => $pixel])
        @endforeach

        @yield('head-end')

        <script>
            var timer = setTimeout(function () {
                window.location =
                    "{!! $data->getFinalDestinationUrl() !!}";
            }, 500);
        </script>
    </head>
    <body>
        <noscript>
            Redirecting to
            <a
                href="{{ $data->getFinalDestinationUrl() }}"
            >
                {{ $data->getFinalDestinationUrl() }}
            </a>
        </noscript>

        @yield('body-end')
    </body>
</html>
