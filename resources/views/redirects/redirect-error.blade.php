@inject('settings', 'Common\Settings\Settings')

<html lang="en">
<head>
    <title>Redirect failed</title>
    <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500" rel="stylesheet">
    <link rel="icon" type="image/svg+xml" href="{{ url('favicon.svg') }}" media="(prefers-color-scheme: light)">
    <link rel="icon" type="image/svg+xml" href="{{ url('favicon-dark.svg') }}" media="(prefers-color-scheme: dark)">
    <link rel="icon" type="image/x-icon" href="{{ url('favicon.ico') }}" sizes="any">
    <link rel="apple-touch-icon" type="image/png" sizes="180x180" href="{{ url('favicon/apple-touch-icon.png') }}">
    <link rel="manifest" href="{{ url('manifest.json') }}">
    <style>
        body {
            background: rgb(250, 250, 250);
            color: rgba(0, 0, 0, 0.87);
            padding: 80px 30px 30px;
            font-family: Roboto,'Helvetica Neue',sans-serif;
        }
        .logo {
            text-align: center;
            margin-bottom: 25px;
        }
        .logo .lockup {
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        img {
            max-width: 64px;
        }
        .brand-name {
            font-size: 24px;
            line-height: 32px;
            font-weight: 600;
            letter-spacing: -0.01em;
            color: rgba(0, 0, 0, 0.87);
        }
        .panel {
            background: rgb(255, 255, 255);
            margin: auto;
            border: 1px solid rgba(0, 0, 0, 0.12);
            padding: 25px;
            border-radius: 4px;
            max-width: 800px;
            text-align: center;
        }
        h1 {
            margin: 0 0 10px;
            font-size: 22px;
            font-weight: 400;
        }
        p {
            font-size: 16px;
            margin: 5px 0;
        }
    </style>
</head>
<body>
<div class="logo">
    <span class="lockup">
        <img class="img-responsive" src="{{ $settings->get('branding.logo_dark') }}" alt="">
        {{-- Reads the same $settings source as the logo above, so one
             configured name serves the lockup (default "Linket"). --}}
        <span class="brand-name">{{ $settings->get('branding.site_name') }}</span>
    </span>
</div>
<div class="panel">
    <h1>Could not redirect to destination url</h1>
    <p>{{$message}}</p>
    <p class="secondary">(This error page is only visible to link owner)</p>
</body>
</html>
