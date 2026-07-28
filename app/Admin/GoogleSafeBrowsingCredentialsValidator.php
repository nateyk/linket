<?php

namespace App\Admin;

use Common\Domains\Validation\ValidateLinkWithGoogleSafeBrowsing;
use Common\Settings\Settings;
use Exception;

class GoogleSafeBrowsingCredentialsValidator
{
    const KEYS = ['google_safe_browsing_key'];

    public function fails($settings)
    {
        config()->set(
            'services.google.safe_browsing_key',
            $settings['google_safe_browsing_key'],
        );

        try {
            $valid = app(ValidateLinkWithGoogleSafeBrowsing::class)->execute(
                'https://google.com',
            );
            if ($valid !== true) {
                return [
                    'server.google_safe_browsing_key' =>
                        'API key not valid. Please specify a valid API key.',
                ];
            }
        } catch (Exception $e) {
            return $this->getErrorMessage($e);
        }
    }

    private function getErrorMessage($e): array
    {
        if ($e->getCode() === 400) {
            $msg = 'API key not valid. Please specify a valid API key.';
        } else {
            $msg = $e->getMessage();
        }
        return ['server.google_safe_browsing_key' => $msg];
    }
}
