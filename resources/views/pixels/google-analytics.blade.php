@section('head-end')
    <script async src="https://www.googletagmanager.com/gtag/js?id=12345"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '{{$pixel->pixel_id}}');
    </script>
@endsection
