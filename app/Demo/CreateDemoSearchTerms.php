<?php

namespace App\Demo;

use App\HelpCenter\Models\SearchTerm;
use App\Models\User;
use Faker\Generator;
use Illuminate\Support\Facades\File;

class CreateDemoSearchTerms
{
    protected Generator $faker;

    public function __construct()
    {
        $this->faker = app(Generator::class);
    }

    public function execute()
    {
        if (SearchTerm::query()->exists()) {
            return;
        }

        $terms = json_decode(
            File::get(resource_path('demo/demo-search-terms.json')),
            true,
        );
        $userIds = User::where('type', 'user')->pluck('id');
        if ($userIds->isEmpty()) {
            return;
        }

        $hasBedeskColumns = \Illuminate\Support\Facades\Schema::hasColumn(
            'search_terms',
            'clicked_article',
        );

        $data = [];

        foreach ($terms as $term) {
            $row = [
                'term' => $term,
                'user_id' => $userIds->random(),
                'created_at' => $this->faker->dateTimeBetween(
                    '6 days ago',
                    'now',
                ),
                'updated_at' => now(),
            ];

            if ($hasBedeskColumns) {
                $row['normalized_term'] = $term;
                $row['result_count'] = rand(0, 10);
                $row['clicked_article'] = (bool) rand(0, 1);
                $row['created_ticket'] = (bool) rand(0, 1);
            } else {
                $row['count'] = rand(1, 10);
                $row['type'] = 'hc';
            }

            $data[] = $row;
        }

        SearchTerm::insert($data);
    }
}
