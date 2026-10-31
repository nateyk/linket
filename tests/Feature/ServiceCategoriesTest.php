<?php

use App\CreatorServices\Models\ServiceCategory;
use App\CreatorServices\Models\ServiceSubcategory;
use App\Models\User;
use Common\Permissions\Models\Permission;
use Database\Seeders\ServiceCategoriesSeeder;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

function createServiceCategoriesAdmin(): User
{
    $admin = User::query()->forceCreate([
        'name' => 'Admin '.Str::random(8),
        'username' => Str::lower(Str::random(12)),
        'email' => Str::random(12).'@example.test',
        'password' => bcrypt('password'),
        'email_verified_at' => now(),
    ]);
    $admin->permissions()->attach(
        Permission::query()->firstOrCreate(['name' => 'admin']),
    );

    return $admin;
}

function serviceCategoriesStateful(Tests\TestCase $test): Tests\TestCase
{
    $csrfToken = 'test-csrf-token';

    $test->flushSession();

    return $test
        ->withSession(['_token' => $csrfToken])
        ->withHeader('Referer', config('app.url'))
        ->withHeader('X-CSRF-TOKEN', $csrfToken);
}

test('it seeds the service taxonomy idempotently', function () {
    $this->seed(ServiceCategoriesSeeder::class);
    $this->seed(ServiceCategoriesSeeder::class);

    expect(ServiceCategory::query()->count())->toBe(12)
        ->and(ServiceSubcategory::query()->count())->toBe(179)
        ->and(
            ServiceCategory::query()
                ->where('slug', 'graphics-design')
                ->value('name'),
        )->toBe('Graphics & Design')
        ->and(
            ServiceSubcategory::query()
                ->where('slug', 'transcription')
                ->count(),
        )->toBe(2);
});

test('an admin can create update and delete service categories', function () {
    $admin = createServiceCategoriesAdmin();

    $response = serviceCategoriesStateful($this)
        ->actingAs($admin)
        ->postJson('/api/v1/admin/service-categories', [
            'name' => 'Test category',
            'description' => 'A category for testing.',
            'status' => 'active',
            'featured' => true,
            'add_to_menu' => true,
            'position' => 7,
        ]);

    $response->assertCreated()
        ->assertJsonPath('category.name', 'Test category')
        ->assertJsonPath('category.slug', 'test-category')
        ->assertJsonPath('category.featured', true)
        ->assertJsonPath('category.add_to_menu', true)
        ->assertJsonPath('category.position', 7);

    $categoryId = $response->json('category.id');

    $this->assertDatabaseHas('service_categories', [
        'id' => $categoryId,
        'slug' => 'test-category',
    ]);

    serviceCategoriesStateful($this)
        ->actingAs($admin)
        ->patchJson("/api/v1/admin/service-categories/{$categoryId}", [
            'name' => 'Renamed category',
            'slug' => 'renamed-category',
            'status' => 'inactive',
        ])
        ->assertOk()
        ->assertJsonPath('category.name', 'Renamed category')
        ->assertJsonPath('category.slug', 'renamed-category')
        ->assertJsonPath('category.status', 'inactive');

    serviceCategoriesStateful($this)
        ->actingAs($admin)
        ->deleteJson("/api/v1/admin/service-categories/{$categoryId}")
        ->assertNoContent();

    $this->assertDatabaseMissing('service_categories', ['id' => $categoryId]);
});

test('an admin can create update and delete service subcategories', function () {
    $admin = createServiceCategoriesAdmin();
    $category = ServiceCategory::query()->create([
        'name' => 'Parent category',
        'slug' => 'parent-category',
        'status' => 'active',
        'position' => 0,
    ]);

    $response = serviceCategoriesStateful($this)
        ->actingAs($admin)
        ->postJson('/api/v1/admin/service-subcategories', [
            'service_category_id' => $category->id,
            'name' => 'Child service',
            'description' => 'A subcategory for testing.',
            'status' => 'active',
        ]);

    $response->assertCreated()
        ->assertJsonPath('subcategory.name', 'Child service')
        ->assertJsonPath('subcategory.slug', 'child-service')
        ->assertJsonPath('subcategory.service_category_id', $category->id);

    $subcategoryId = $response->json('subcategory.id');

    serviceCategoriesStateful($this)
        ->actingAs($admin)
        ->patchJson("/api/v1/admin/service-subcategories/{$subcategoryId}", [
            'service_category_id' => $category->id,
            'name' => 'Renamed child',
            'slug' => 'renamed-child',
            'status' => 'inactive',
            'featured' => true,
        ])
        ->assertOk()
        ->assertJsonPath('subcategory.name', 'Renamed child')
        ->assertJsonPath('subcategory.status', 'inactive')
        ->assertJsonPath('subcategory.featured', true);

    serviceCategoriesStateful($this)
        ->actingAs($admin)
        ->deleteJson("/api/v1/admin/service-subcategories/{$subcategoryId}")
        ->assertNoContent();

    $this->assertDatabaseMissing('service_subcategories', [
        'id' => $subcategoryId,
    ]);
});

test('the public endpoint only returns active categories and subcategories', function () {
    $active = ServiceCategory::query()->create([
        'name' => 'Visible category',
        'slug' => 'visible-category',
        'status' => 'active',
        'position' => 0,
    ]);
    ServiceSubcategory::query()->create([
        'service_category_id' => $active->id,
        'name' => 'Visible subcategory',
        'slug' => 'visible-subcategory',
        'status' => 'active',
        'position' => 0,
    ]);
    ServiceSubcategory::query()->create([
        'service_category_id' => $active->id,
        'name' => 'Hidden subcategory',
        'slug' => 'hidden-subcategory',
        'status' => 'inactive',
        'position' => 1,
    ]);
    ServiceCategory::query()->create([
        'name' => 'Hidden category',
        'slug' => 'hidden-category',
        'status' => 'inactive',
        'position' => 1,
    ]);

    $response = serviceCategoriesStateful($this)->getJson(
        '/api/v1/public/service-categories',
    );

    $response->assertOk();

    // CI seeds the standard taxonomy before tests. Check the fixture by slug
    // instead of assuming it is the only active category in the database.
    $categories = collect($response->json('data'));
    $visible = $categories->firstWhere('slug', 'visible-category');

    expect($visible)->not->toBeNull()
        ->and($categories->contains('slug', 'hidden-category'))->toBeFalse()
        ->and($categories->every(fn ($category) => $category['status'] === 'active'))->toBeTrue()
        ->and($visible['subcategories'])->toHaveCount(1)
        ->and($visible['subcategories'][0]['name'])->toBe('Visible subcategory');
});

test('non admins cannot manage service categories', function () {
    $user = User::query()->forceCreate([
        'name' => 'Regular user',
        'username' => Str::lower(Str::random(12)),
        'email' => Str::random(12).'@example.test',
        'password' => bcrypt('password'),
        'email_verified_at' => now(),
    ]);

    serviceCategoriesStateful($this)
        ->actingAs($user)
        ->getJson('/api/v1/admin/service-categories')
        ->assertForbidden();

    serviceCategoriesStateful($this)
        ->actingAs($user)
        ->postJson('/api/v1/admin/service-categories', [
            'name' => 'Nope',
        ])
        ->assertForbidden();
});
