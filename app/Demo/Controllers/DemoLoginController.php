<?php

namespace App\Demo\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;

class DemoLoginController extends Controller
{
    public function __invoke(Request $request)
    {
        if (!config('app.demo')) {
            abort(404);
        }

        if (Auth::check()) {
            return redirect(config('app.url') . '/dashboard');
        }

        $data = $request->validate([
            'type' => 'required|in:admin,user',
        ]);

        if ($data['type'] === 'admin') {
            $user = User::query()
                ->where('email', 'admin@admin.com')
                ->firstOrFail();
            Auth::login($user);
            return redirect(config('app.url') . '/admin/insights');
        } else {
            $user = User::query()
                ->where('email', 'user@user.com')
                ->firstOrFail();
            Auth::login($user);
            return redirect(config('app.url') . '/dashboard');
        }
    }
}
