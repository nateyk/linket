@if ($attributes->has('href'))
    <a
        href="{{ $attributes->get('href') }}"
        type="submit"
        class="bg-primary text-primary-foreground mt-6 block w-max rounded-sm px-4 py-2 font-semibold shadow-sm focus:ring"
        >{{ $slot }}</a
    >
@else
    <button
        type="submit"
        class="bg-primary text-primary-foreground mt-6 block w-max rounded-sm px-4 py-2 font-semibold shadow-sm focus:ring"
    >
        {{ $slot }}
    </button>
@endif
