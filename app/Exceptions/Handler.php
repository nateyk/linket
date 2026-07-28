<?php

namespace App\Exceptions;

use App\Links\Exceptions\LinkRedirectFailed;
use Common\Core\Exceptions\BaseExceptionHandler;

class Handler extends BaseExceptionHandler
{
    protected $dontReport = [LinkRedirectFailed::class];
}
