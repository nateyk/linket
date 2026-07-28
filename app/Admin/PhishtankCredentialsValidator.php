<?php

namespace App\Admin;

use Common\Domains\Validation\ValidateLinkWithPhishtank;
use Common\Settings\Settings;
use Exception;

class PhishtankCredentialsValidator
{
    const KEYS = ['links.phishtank_key'];

    public function fails($settings)
    {
        app(Settings::class)->set('links.phishtank_key', $settings['links.phishtank_key']);

        try {
            $valid = app(ValidateLinkWithPhishtank::class)->execute(
                'https://google.com',
            );
            if ($valid !== true) {
                return [
                    'phishtank_group' => 'This API key is not valid.',
                ];
            }
        } catch (Exception $e) {
            return $this->getErrorMessage($e);
        }
    }

    private function getErrorMessage($e): array
    {
        if ($e->getCode() === 403) {
            $msg = 'This API key is not valid.';
        } else {
            $msg = $e->getMessage();
        }
        return ['phishtank_group' => $msg];
    }
}
