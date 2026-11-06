<?php

namespace Tests\Support;

use Illuminate\Cache\FileStore;

/** Observes real file-lock contention without replacing acquisition or storage. */
final class ObservedMcpSessionLockStore extends FileStore
{
    private bool $announcedContention = false;

    public function add(mixed $key, mixed $value, mixed $seconds): bool
    {
        $acquired = parent::add($key, $value, $seconds);
        if (! $acquired && ! $this->announcedContention && str_starts_with($key, 'file-store-lock:session:')) {
            $this->announcedContention = true;
            fwrite(STDOUT, "blocked\n");
            fflush(STDOUT);
        }

        return $acquired;
    }
}
