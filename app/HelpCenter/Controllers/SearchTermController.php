<?php

namespace App\HelpCenter\Controllers;

use App\HelpCenter\Actions\AggregateSearchTerms;
use App\HelpCenter\Models\SearchTerm;
use Common\Core\BaseController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class SearchTermController extends BaseController
{
    public function storeSearchSession()
    {
        if (Auth::user()?->isAgent() && app()->environment('production')) {
            return $this->success();
        }

        $data = $this->validatedSession();

        (new AggregateSearchTerms())
            ->execute($data['searchSession'])
            ->each(function (array $item) {
                SearchTerm::create([
                    'term' => $item['term'],
                    'normalized_term' => $item['normalized_term'] ?? null,
                    'result_count' => count($item['results']),
                    'clicked_article' => (bool) ($item['clickedArticle'] ?? false),
                    'created_ticket' => (bool) ($item['createdTicket'] ?? false),
                    'category_id' => $item['categoryId'] ?? null,
                    'user_id' => Auth::id(),
                    // An IP address is not necessary to report search quality.
                    // Do not store or truncate IPv6 or visitor IP addresses.
                ]);
            });

        return $this->success();
    }

    protected function validatedSession(): array
    {
        // sendBeacon with a string body uses text/plain and must be decoded.
        $payload = request()->has('searchSession')
            ? request()->all()
            : json_decode(request()->getContent(), true);

        if (! is_array($payload)) {
            throw ValidationException::withMessages([
                'searchSession' => 'Invalid search session JSON.',
            ]);
        }

        return Validator::make($payload, [
            'searchSession' => 'required|array|max:30',
            'searchSession.*.term' => 'required|string|min:4|max:150',
            'searchSession.*.results' => 'required|array|max:100',
            'searchSession.*.results.*' => 'integer|min:1',
            'searchSession.*.clickedArticle' => 'sometimes|boolean',
            'searchSession.*.createdTicket' => 'sometimes|boolean',
            'searchSession.*.categoryId' => 'nullable|integer|min:1',
        ])->validate();
    }
}
