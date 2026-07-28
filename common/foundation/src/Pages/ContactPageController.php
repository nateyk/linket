<?php

namespace Common\Pages;

use App\Models\User;
use Common\Core\Demo\BlockedOnDemoSite;
use Common\Notifications\ContactPageMessage;
use Common\Validation\CaptchaTokenValid;
use Common\API\ExcludeRoutesFromPublicDocs;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

#[ExcludeRoutesFromPublicDocs]
class ContactPageController extends Controller
{
    #[BlockedOnDemoSite]
    public function sendMessage(Request $request)
    {
        if (!config('mail.enable_contact_page')) {
            abort(404);
        }

        $data = $request->validate([
            'name' => 'required|string|min:5',
            'email' => 'required|email',
            'message' => 'required|string|min:10',
            'captcha_token' => [new CaptchaTokenValid('contact')],
        ]);

        $notification = new ContactPageMessage($data);

        (new User())
            ->forceFill([
                'name' => config('mail.from.name'),
                'email' => settings(
                    'mail.contact_page_address',
                    config('mail.from.address'),
                ),
            ])
            ->notify($notification);
    }
}
