<?php

namespace App\Links\Exceptions;

use App\Links\Models\Linkeable;
use Exception;
use Illuminate\Contracts\Auth\Access\Gate;
use Illuminate\Contracts\Support\Responsable;

class LinkRedirectFailed extends Exception implements Responsable
{
    protected Linkeable $linkeable;
    protected ?string $redirectUrl = null;

    public function toResponse($request)
    {
        if (app(Gate::class)->allows('show', $this->linkeable)) {
            return response()->view(
                'redirects/redirect-error',
                [
                    'message' => $this->getMessage(),
                    'linkeable' => $this->linkeable,
                ],
                403,
            );
        } elseif ($this->redirectUrl) {
            return response()->redirectTo($this->redirectUrl);
        } else {
            abort(404);
        }
    }

    public function setModel(Linkeable $linkeable): self
    {
        $this->linkeable = $linkeable;
        return $this;
    }

    public function setRedirectUrl(string|null $url = null): self
    {
        $this->redirectUrl = $url;
        return $this;
    }
}
