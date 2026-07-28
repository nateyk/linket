@extends ('common::prerender.base')

@section ('head')
  @include ('seo.landing-page.seo-tags')
@endsection

@section ('body')
  @if ($data = settings('landingPage'))
    @if (isset($data['sections']))
      @foreach ($data['sections'] as $section)
        @if ($section['name'] === 'hero-split-with-screenshot' ||
          $section['name'] === 'hero-with-background-image' ||
          $section['name'] === 'hero-simple-centered')
          <section>
            @if (isset($section['badge']))
              <span>{{ $section['badge'] }}</span>
            @endif

            <h1>{{ $section['title'] }}</h1>
            <p>{{ $section['description'] }}</p>
            @if (isset($section['buttons']))
              @foreach ($section['buttons'] as $button)
                @isset ($button['action'])
                  <a href="{{ $button['action'] }}"> {{ $button['label'] }} </a>
                @endisset
              @endforeach
            @endif
          </section>
        @elseif ($section['name'] === 'features-grid')
          <section>
            @if (isset($section['badge']))
              <span>{{ $section['badge'] }}</span>
            @endif

            <h2>{{ $section['title'] }}</h2>
            <p>{{ $section['description'] }}</p>
            @if (isset($section['features']))
              <ul>
                @foreach ($section['features'] as $feature)
                  <li>
                    <h3>{{ $feature['title'] }}</h3>
                    <p>{{ $feature['description'] }}</p>
                  </li>
                @endforeach
              </ul>
            @endif
          </section>
        @elseif ($section['name'] === 'feature-with-screenshot')
          <section>
            @if (isset($section['badge']))
              <span>{{ $section['badge'] }}</span>
            @endif

            <h2>{{ $section['title'] }}</h2>
            <p>{{ $section['description'] }}</p>
            @if (isset($section['features']))
              <ul>
                @foreach ($section['features'] as $feature)
                  <li>
                    <h3>{{ $feature['title'] }}</h3>
                    <p>{{ $feature['description'] }}</p>
                  </li>
                @endforeach
              </ul>
            @endif
          </section>
        @elseif ($section['name'] === 'cta-simple-centered')
          <section>
            <h2>{{ $section['title'] }}</h2>
            <p>{{ $section['description'] }}</p>
            @if (isset($section['buttons']))
              @foreach ($section['buttons'] as $button)
                <a href="{{ $button['action'] }}"> {{ $button['label'] }} </a>
              @endforeach
            @endif
          </section>
        @elseif ($section['name'] === 'pricing')
          <section>
            <h2>{{ $section['title'] }}</h2>
            <p>{{ $section['description'] }}</p>
          </section>
        @elseif ($section['name'] === 'footer')
          <footer>
            @if (isset($section['title']))
              <div>{{ $section['title'] }}</div>
            @endif

            @if (isset($section['description']))
              <p>{{ $section['description'] }}</p>
            @endif
          </footer>
        @endif
      @endforeach
    @endif
  @endif
@endsection
