<?php

use App\Admin\GoogleSafeBrowsingCredentialsValidator;
use App\Admin\PhishtankCredentialsValidator;

return [
    PhishtankCredentialsValidator::class,
    GoogleSafeBrowsingCredentialsValidator::class,
];
