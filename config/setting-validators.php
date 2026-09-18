<?php

use App\Admin\GoogleSafeBrowsingCredentialsValidator;
use App\Admin\PhishtankCredentialsValidator;
use App\Admin\ProductSettingsValidator;

return [
    PhishtankCredentialsValidator::class,
    GoogleSafeBrowsingCredentialsValidator::class,
    ProductSettingsValidator::class,
];
