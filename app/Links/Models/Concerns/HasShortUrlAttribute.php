<?php

namespace App\Links\Models\Concerns;

trait HasShortUrlAttribute
{
    public function getShortUrlAttribute()
    {
        if ($this->getDomainId() && $this->getDomain()) {
            $defaultHost = $this->getDomain()->host;
        } else {
            $defaultHost =
                settings('custom_domains.default_host') ?: config('app.url');
        }

        return "$defaultHost/$this->back_half";
    }
}
