<?php

namespace App\Links\Linkeable;

use App\QrCodes\Actions\CrupdateQrCode;
use App\Links\Actions\GetMetadataFromUrl;
use App\Links\Models\Link;
use App\Links\Models\Linkeable;
use Common\Roles\Models\Role;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;

abstract class CrupdateLinkeable
{
    protected function saveLinkeableRules(
        Linkeable $linkeable,
        array $data,
    ): void {
        if (array_key_exists('rules', $data)) {
            $linkeable->rules()->delete();

            // allow removing rules by setting key or value to null
            $newRules = collect($data['rules'])
                ->filter(
                    fn($rule) => !is_null($rule['key']) &&
                        !is_null($rule['value']),
                )
                ->toArray();

            if (!empty($newRules)) {
                $linkeable->setRelation(
                    'rules',
                    $linkeable->rules()->createMany($newRules),
                );
            }
        }
    }

    protected function saveLinkeableTrackingPixels(
        Linkeable $linkeable,
        array $data,
    ): void {
        if (array_key_exists('pixels', $data)) {
            $pixels = collect($data['pixels'] ?? [])->map(
                fn($pixel) => is_scalar($pixel) ? $pixel : $pixel['id'],
            );
            $linkeable->pixels()->sync($pixels);
        }
    }

    protected function getUtmInlineData(array $data): array
    {
        if (
            array_key_exists('utm', $data) ||
            array_key_exists('utm_custom', $data)
        ) {
            $utm = $data['utm'] ?? [];
            foreach ($data['utm_custom'] ?? [] as $custom) {
                $utm[$custom['key']] = $custom['value'];
            }
            return ['utm' => Arr::query($utm)];
        }

        return [];
    }

    protected function getExpirationAndPasswordInlineData(
        array $specifiedData,
    ): array {
        $data = Arr::only($specifiedData, ['expires_at', 'activates_at']);

        if (
            array_key_exists('password', $specifiedData) &&
            $specifiedData['password'] !== Link::PLACEHOLDER_PASSWORD
        ) {
            $data['password'] = $specifiedData['password'];
        }

        return $data;
    }

    protected function getLongUrlInlineData(array $data): array
    {
        if (isset($data['long_url'])) {
            return [
                'long_url' => GetMetadataFromUrl::normalizeUrl(
                    $data['long_url'],
                ),
            ];
        }

        return [];
    }

    protected function saveLinkeableTags(
        Linkeable $linkeable,
        array $data,
    ): void {
        if (!array_key_exists('tags', $data)) {
            return;
        }

        $tagIds = collect($data['tags'])->map(
            fn($tag) => is_scalar($tag) ? $tag : $tag['id'],
        );
        $linkeable->tags()->sync($tagIds);
    }

    protected function saveQrCode(
        Linkeable $linkeable,
        array $specifiedData,
    ): void {
        // qr code can't be deleted from linkeable pages, only from main qr code page
        if (
            Arr::get($specifiedData, 'create_qr_code') ||
            ($linkeable->qrCode && isset($specifiedData['qr_code_style']))
        ) {
            (new CrupdateQrCode())->execute(
                ['style' => $specifiedData['qr_code_style'] ?? null],
                linkeable: $linkeable,
                qrCode: $linkeable->qrCode,
            );
        }
    }

    protected function filterOutDataBasedOnUserPermissions(
        array $data,
        array $extraFieldsToRemove = [],
    ): array {
        $authModel = Auth::user() ?: Role::where('guests', true)->first();

        if ($authModel->hasPermission('admin')) {
            return $data;
        }

        foreach ($extraFieldsToRemove as $field) {
            unset($data[$field]);
        }

        if (!$authModel->getRestrictionValue('links.create', 'back_half')) {
            unset($data['back_half']);
        }

        if (!$authModel->getRestrictionValue('links.create', 'expiration')) {
            unset($data['expires_at']);
            unset($data['activates_at']);

            if (isset($data['rules'])) {
                $data['rules'] = array_filter(
                    $data['rules'],
                    fn($rule) => $rule['type'] !== 'exp_clicks',
                );
            }
        }

        if (!$authModel->getRestrictionValue('links.create', 'password')) {
            unset($data['password']);
        }

        if (!$authModel->getRestrictionValue('links.create', 'utm')) {
            unset($data['utm']);
            unset($data['utm_custom']);
        }

        if (!$authModel->getRestrictionValue('links.create', 'retargeting')) {
            unset($data['rules']);
        }

        return $data;
    }
}
