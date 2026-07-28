<?php

namespace App\Links\Controllers;

use App\Links\Actions\GetMetadataFromUrl;
use App\Links\Actions\LinkeablePublicPolicy;
use App\Links\Models\Link;
use Illuminate\Routing\Controller;

class LinkImageController extends Controller
{
    public function show(string $backHalf)
    {
        $link = Link::query()->where('back_half', $backHalf)->firstOrFail();

        if (!app(LinkeablePublicPolicy::class)->isAccessible($link)) {
            abort(403);
        }

        if (!isCrawler() && !$link->image) {
            $metadata = (new GetMetadataFromUrl())->execute($link->long_url);
            if ($metadata['image']) {
                $link->fill(['image' => $metadata['image']])->save();
            }
        }

        if ($link->image) {
            return redirect($link->image);
        } else {
            return response()->noContent(404);
        }
    }
}
