<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Common\Blog\Models\BlogArticle;
use Common\Blog\Models\BlogCategory;

$category = BlogCategory::create(["name" => "Test", "slug" => "test-cat-" . time()]);
$article = BlogArticle::create([
    "title" => "Test",
    "slug" => "test-article-" . time(),
    "body" => "<p>Body</p>",
    "status" => "published",
    "published_at" => now()->subDay(),
    "blog_category_id" => $category->id,
]);

$articles = BlogArticle::query()->published()->with("category")->simplePaginate(20);
echo "Type: " . get_class($articles) . PHP_EOL;
echo "Count: " . $articles->count() . PHP_EOL;
echo "Last page: " . $articles->lastPage() . PHP_EOL;