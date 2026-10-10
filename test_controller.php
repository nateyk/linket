<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Common\Blog\Models\BlogCategory;
use Common\Blog\Models\BlogArticle;
use Common\Blog\Http\Controllers\BlogController;
use Illuminate\Http\Request;

$category = BlogCategory::create(["name" => "Test", "slug" => "test-slug", "views" => 10]);
BlogArticle::create([
    "title" => "Test",
    "slug" => "test-article",
    "body" => "<p>Body</p>",
    "status" => "published",
    "published_at" => now()->subDay(),
    "blog_category_id" => $category->id,
]);

echo "Before: " . $category->views . PHP_EOL;

$controller = new BlogController();
$request = Request::create("/api/v1/blog/categories/test-slug", "GET");
$response = $controller->category($request);

echo "Response status: " . $response->getStatusCode() . PHP_EOL;
echo "Category views after: " . $category->fresh()->views . PHP_EOL;