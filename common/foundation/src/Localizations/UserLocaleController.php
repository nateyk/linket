<?php

namespace Common\Localizations;

use Common\Localizations\LocalizationsRepository;
use Common\Localizations\Resources\LocalizationResource;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

/**
 * @tags Localizations
 */
#[ExcludeRoutesFromPublicDocs]
class UserLocaleController extends Controller
{
    const COOKIE_NAME = 'selected_locale';

    /**
     * Update user's locale.
     *
     * @operationId updateUserLocale
     */
    public function update(Request $request)
    {
        $data = $request->validate([
            'locale' => 'required|string|min:2',
        ]);

        if ($user = request()->user()) {
            $user->fill(['language' => $data['locale']])->save();
        } else {
            cookie()->queue(
                self::COOKIE_NAME,
                $data['locale'],
                1260,
                null,
                null,
                null,
                false,
                false,
            );
        }

        $locale = app(LocalizationsRepository::class)->getByNameOrCode(
            $data['locale'],
        );

        return new LocalizationResource($locale);
    }
}
