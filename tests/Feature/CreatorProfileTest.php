<?php

namespace Tests\Feature;

use App\Biolinks\Actions\ConvertBiolinkToCreatorProfile;
use App\Biolinks\Actions\CrupdateBiolink;
use App\Biolinks\Models\Biolink;
use App\Biolinks\Models\BiolinkWidget;
use App\Biolinks\Requests\UpdateCreatorProfileRequest;
use App\Models\User;
use App\Storefront\Models\DigitalProduct;
use Common\Files\FileEntry;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Tests\TestCase;

class CreatorProfileTest extends TestCase
{
    use DatabaseTransactions;

    public function testLegacyContentMapsToARepeatableCreatorProfile(): void
    {
        $biolink = new Biolink([
            'name' => 'Design Studio',
            'builder_mode' => Biolink::BUILDER_MODE_LEGACY,
        ]);
        $biolink->setRelation('user', new User([
            'name' => 'Nate Creator',
            'image' => 'https://example.test/avatar.jpg',
        ]));
        $biolink->setRelation('links', new Collection());
        $biolink->setRelation('widgets', new Collection([
            $this->widget(1, 'image', ['type' => 'avatar', 'url' => 'https://example.test/profile.jpg']),
            $this->widget(2, 'image', ['type' => 'default', 'url' => 'https://example.test/cover.jpg']),
            $this->widget(3, 'text', ['title' => 'Product designer', 'description' => 'I build useful products.']),
            $this->widget(4, 'socials', ['instagram' => '@nate']),
        ]));

        $profile = app(ConvertBiolinkToCreatorProfile::class)->profileFor($biolink);

        $this->assertSame('Nate Creator', $profile['display_name']);
        $this->assertSame('Product designer', $profile['profile_title']);
        $this->assertSame('I build useful products.', $profile['bio']);
        $this->assertSame('', $profile['about_html']);
        $this->assertSame('https://example.test/profile.jpg', $profile['avatar_url']);
        $this->assertSame('https://example.test/cover.jpg', $profile['cover_url']);
        $this->assertSame(['instagram' => '@nate'], $profile['social_links']);
        $this->assertSame([1, 2, 3, 4], $profile['source_widget_ids']);
    }

    public function testCreatorProfileValidationEnforcesSkillsAndDestinations(): void
    {
        $request = new UpdateCreatorProfileRequest();
        $rules = $request->rules();

        $valid = Validator::make([
            'display_name' => 'Nate Creator',
            'profile_title' => 'Product designer',
            'available_for_work' => true,
            'skills' => ['Laravel', 'React'],
            'contact_url' => 'creator@example.test',
            'social_links' => ['instagram' => '@creator'],
            'featured_product_ids' => [],
        ], $rules);
        $this->assertFalse($valid->fails());

        $invalid = Validator::make([
            'display_name' => 'Nate Creator',
            'available_for_work' => true,
            'skills' => range(1, 9),
            'contact_url' => 'not a destination',
            'social_links' => ['unsupported' => 'value'],
            'featured_product_ids' => range(1, 7),
        ], $rules);
        $this->assertTrue($invalid->fails());
        $this->assertArrayHasKey('skills', $invalid->errors()->toArray());
        $this->assertArrayHasKey('contact_url', $invalid->errors()->toArray());
        $this->assertArrayHasKey('social_links', $invalid->errors()->toArray());
        $this->assertArrayHasKey('featured_product_ids', $invalid->errors()->toArray());
    }

    public function testNewBiolinksStartAsStructuredCreatorProfiles(): void
    {
        $user = $this->createUser();
        $workspace = $this->createWorkspace($user);
        $this->actingAs($user);

        $biolink = app(CrupdateBiolink::class)->execute([
            'name' => 'Nate Portfolio',
            'workspace_id' => $workspace->id,
        ]);

        $this->assertSame(Biolink::BUILDER_MODE_CREATOR_PROFILE, $biolink->builder_mode);
        $this->assertSame($user->name, $biolink->profile_config['display_name']);
        $this->assertSame($user->image, $biolink->profile_config['avatar_url']);
        $this->assertSame('', $biolink->profile_config['about_html']);
        $this->assertCount(0, $biolink->widgets);
    }

    public function testOwnerCanSaveSanitizedRichAboutContent(): void
    {
        $user = $this->createUser();
        $workspace = $this->createWorkspace($user);
        $biolink = $this->createBiolink([
            'user_id' => $user->id,
            'workspace_id' => $workspace->id,
            'builder_mode' => Biolink::BUILDER_MODE_CREATOR_PROFILE,
            'profile_config' => [],
        ]);

        $this->withoutMiddleware();
        $this->actingAs($user);

        $response = $this->putJson("/api/v1/biolinks/{$biolink->id}/creator-profile", [
            ...$this->validProfilePayload(),
            'about_html' => '<h2>My story</h2><p onclick="alert(1)"><strong>Useful work</strong></p><a href="javascript:alert(1)">Unsafe</a><a href="https://example.test/work">Portfolio</a><img src="https://example.test/tracker.png"><script>alert(1)</script>',
            'featured_product_ids' => [],
        ])->assertOk();

        $aboutHtml = $biolink->fresh()->profile_config['about_html'];

        $this->assertStringContainsString('<h2>My story</h2>', $aboutHtml);
        $this->assertStringContainsString('<strong>Useful work</strong>', $aboutHtml);
        $this->assertStringContainsString('https://example.test/work', $aboutHtml);
        $this->assertStringNotContainsString('onclick', $aboutHtml);
        $this->assertStringNotContainsString('javascript:', $aboutHtml);
        $this->assertStringNotContainsString('<img', $aboutHtml);
        $this->assertStringNotContainsString('<script', $aboutHtml);
        $response->assertJsonPath('data.profile_config.about_html', $aboutHtml);
    }

    public function testOlderProfileClientsDoNotEraseExistingAboutContent(): void
    {
        $user = $this->createUser();
        $workspace = $this->createWorkspace($user);
        $biolink = $this->createBiolink([
            'user_id' => $user->id,
            'workspace_id' => $workspace->id,
            'builder_mode' => Biolink::BUILDER_MODE_CREATOR_PROFILE,
            'profile_config' => [
                'about_html' => '<p>Existing creator story.</p>',
            ],
        ]);
        $payload = $this->validProfilePayload();
        unset($payload['about_html']);

        $this->withoutMiddleware();
        $this->actingAs($user);

        $this->putJson("/api/v1/biolinks/{$biolink->id}/creator-profile", [
            ...$payload,
            'featured_product_ids' => [],
        ])->assertOk();

        $this->assertSame(
            '<p>Existing creator story.</p>',
            $biolink->fresh()->profile_config['about_html'],
        );
    }

    public function testOwnerCanConvertAndUpdateAProfileWithoutLosingSourceWidgetIds(): void
    {
        $user = $this->createUser();
        $workspace = $this->createWorkspace($user);
        $biolink = $this->createBiolink([
            'user_id' => $user->id,
            'workspace_id' => $workspace->id,
            'builder_mode' => Biolink::BUILDER_MODE_LEGACY,
        ]);
        $sourceWidget = $biolink->widgets()->create([
            'type' => 'text',
            'position' => 0,
            'config' => ['title' => 'Designer'],
        ]);

        $this->withoutMiddleware();
        $this->actingAs($user);
        $this->postJson("/api/v1/biolinks/{$biolink->id}/creator-profile/convert")
            ->assertOk()
            ->assertJsonPath('data.builder_mode', Biolink::BUILDER_MODE_CREATOR_PROFILE);

        $this->putJson("/api/v1/biolinks/{$biolink->id}/creator-profile", [
                'display_name' => 'Updated Creator',
                'profile_title' => 'Product designer',
                'bio' => 'Independent creator.',
                'available_for_work' => true,
                'skills' => ['Laravel', 'React'],
                'contact_url' => 'creator@example.test',
                'social_links' => ['instagram' => '@creator'],
                'featured_product_ids' => [],
            ])
            ->assertOk()
            ->assertJsonPath('data.profile_config.display_name', 'Updated Creator');

        $this->assertSame(
            [$sourceWidget->id],
            $biolink->fresh()->creatorProfileSourceWidgetIds(),
        );
    }

    public function testOwnerCanSaveRelativeUrlsForOwnedCreatorProfileImages(): void
    {
        $user = $this->createUser();
        $workspace = $this->createWorkspace($user);
        $biolink = $this->createBiolink([
            'user_id' => $user->id,
            'workspace_id' => $workspace->id,
            'builder_mode' => Biolink::BUILDER_MODE_CREATOR_PROFILE,
            'profile_config' => [],
        ]);
        $avatar = $this->createLinkImage($user, $workspace, 'avatar.jpg');
        $cover = $this->createLinkImage($user, $workspace, 'cover.jpg');

        $this->withoutMiddleware();
        $this->actingAs($user);

        $this->putJson("/api/v1/biolinks/{$biolink->id}/creator-profile", [
                ...$this->validProfilePayload(),
                'avatar_url' => "storage/link-images/{$avatar->file_name}",
                'cover_url' => "/storage/link-images/{$cover->file_name}",
                'featured_product_ids' => [],
            ])
            ->assertOk()
            ->assertJsonPath(
                'data.profile_config.avatar_url',
                "/storage/link-images/{$avatar->file_name}",
            )
            ->assertJsonPath(
                'data.profile_config.cover_url',
                "/storage/link-images/{$cover->file_name}",
            );
    }

    public function testCreatorProfileRejectsUnownedOrMissingRelativeImages(): void
    {
        $owner = $this->createUser();
        $otherUser = $this->createUser();
        $workspace = $this->createWorkspace($owner);
        $biolink = $this->createBiolink([
            'user_id' => $owner->id,
            'workspace_id' => $workspace->id,
            'builder_mode' => Biolink::BUILDER_MODE_CREATOR_PROFILE,
            'profile_config' => [],
        ]);
        $unownedAvatar = $this->createLinkImage(
            $otherUser,
            $workspace,
            'unowned-avatar.jpg',
        );

        $this->withoutMiddleware();
        $this->actingAs($owner);

        $this->putJson("/api/v1/biolinks/{$biolink->id}/creator-profile", [
                ...$this->validProfilePayload(),
                'avatar_url' => "storage/link-images/{$unownedAvatar->file_name}",
                'cover_url' => 'storage/link-images/missing-cover.jpg',
                'featured_product_ids' => [],
            ])
            ->assertUnprocessable()
            ->assertInvalid(['avatar_url', 'cover_url']);
    }

    public function testCreatorProfilesRejectManuallyAddedLinksAndWidgets(): void
    {
        $user = $this->createUser();
        $workspace = $this->createWorkspace($user);
        $biolink = $this->createBiolink([
            'user_id' => $user->id,
            'workspace_id' => $workspace->id,
            'builder_mode' => Biolink::BUILDER_MODE_CREATOR_PROFILE,
            'profile_config' => [],
        ]);

        $this->withoutMiddleware();
        $this->actingAs($user);
        $this->postJson("/api/v1/biolink/{$biolink->id}/widget", [
                'type' => 'youtube',
                'config' => ['url' => 'https://youtube.com/watch?v=test'],
            ])
            ->assertUnprocessable();

        $this->postJson("/api/v1/biolink/{$biolink->id}/widget", [
                'type' => 'image',
                'config' => [
                    'type' => 'default',
                    'url' => 'https://example.test/work.jpg',
                ],
            ])
            ->assertUnprocessable();

        $this->postJson("/api/v1/biolink/{$biolink->id}/link", [
                'name' => 'Manual work link',
                'long_url' => 'https://example.test/work',
            ])
            ->assertUnprocessable();
    }

    public function testAnotherUserCannotChangeTheCreatorProfile(): void
    {
        $owner = $this->createUser();
        $otherUser = $this->createUser();
        $workspace = $this->createWorkspace($owner);
        $biolink = $this->createBiolink([
            'user_id' => $owner->id,
            'workspace_id' => $workspace->id,
            'builder_mode' => Biolink::BUILDER_MODE_CREATOR_PROFILE,
            'profile_config' => [],
        ]);

        $this->assertFalse(Gate::forUser($otherUser)->allows('update', $biolink));
    }

    public function testOwnerCanFeatureApprovedDownloadableProductsOnOneBioPage(): void
    {
        $user = $this->createUser();
        $workspace = $this->createWorkspace($user);
        $biolink = $this->createBiolink([
            'user_id' => $user->id,
            'workspace_id' => $workspace->id,
            'builder_mode' => Biolink::BUILDER_MODE_CREATOR_PROFILE,
            'profile_config' => [],
        ]);
        $otherBiolink = $this->createBiolink([
            'user_id' => $user->id,
            'workspace_id' => $workspace->id,
            'builder_mode' => Biolink::BUILDER_MODE_CREATOR_PROFILE,
            'profile_config' => [],
        ]);
        $product = $this->createDigitalProduct($user, $workspace, 'approved');
        $product->biolinks()->attach($otherBiolink->id);

        $this->withoutMiddleware();
        $this->actingAs($user);
        $this->putJson("/api/v1/biolinks/{$biolink->id}/creator-profile", [
                ...$this->validProfilePayload(),
                'featured_product_ids' => [$product->id],
            ])
            ->assertOk();

        $this->assertTrue($product->biolinks()->whereKey($biolink->id)->exists());
        $this->assertTrue($product->biolinks()->whereKey($otherBiolink->id)->exists());
        $this->assertSame(
            [$product->id],
            $biolink->fresh()->digitalProducts()->pluck('digital_products.id')->all(),
        );
        $this->assertSame(
            [$product->id],
            $biolink->fresh()->widgets()->where('type', 'shop')->firstOrFail()->config['product_ids'],
        );

        $this->putJson("/api/v1/biolinks/{$biolink->id}/creator-profile", [
                ...$this->validProfilePayload(),
                'featured_product_ids' => [],
            ])
            ->assertOk();

        $this->assertSame(0, $biolink->fresh()->digitalProducts()->count());
        $this->assertSame(0, $biolink->fresh()->widgets()->where('type', 'shop')->count());
        $this->assertTrue($product->biolinks()->whereKey($otherBiolink->id)->exists());
    }

    public function testProfileRejectsProductsThatAreNotApprovedOrOwnedByTheCreator(): void
    {
        $owner = $this->createUser();
        $otherUser = $this->createUser();
        $workspace = $this->createWorkspace($owner);
        $biolink = $this->createBiolink([
            'user_id' => $owner->id,
            'workspace_id' => $workspace->id,
            'builder_mode' => Biolink::BUILDER_MODE_CREATOR_PROFILE,
            'profile_config' => [],
        ]);
        $draft = $this->createDigitalProduct($owner, $workspace, 'draft');
        $otherProduct = $this->createDigitalProduct($otherUser, $workspace, 'approved');

        $this->withoutMiddleware();
        $this->actingAs($owner);

        foreach ([$draft, $otherProduct] as $product) {
            $this->putJson("/api/v1/biolinks/{$biolink->id}/creator-profile", [
                    ...$this->validProfilePayload(),
                    'featured_product_ids' => [$product->id],
                ])
                ->assertUnprocessable();
        }

        $this->assertSame(0, $biolink->digitalProducts()->count());
    }

    private function widget(int $id, string $type, array $config): BiolinkWidget
    {
        $widget = new BiolinkWidget([
            'type' => $type,
            'active' => true,
            'position' => $id,
            'config' => $config,
        ]);
        $widget->id = $id;

        return $widget;
    }

    private function createUser(): User
    {
        $token = Str::lower(Str::random(12));

        return User::query()->forceCreate([
            'name' => 'Creator ' . $token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'image' => 'https://example.test/avatar.jpg',
            'email_verified_at' => now(),
        ]);
    }

    private function createWorkspace(User $owner): Workspace
    {
        return Workspace::query()->create([
            'name' => 'Creator workspace',
            'owner_id' => $owner->id,
        ]);
    }

    private function createDigitalProduct(
        User $creator,
        Workspace $workspace,
        string $status,
    ): DigitalProduct {
        $product = DigitalProduct::query()->create([
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'title' => 'Creator product ' . Str::random(6),
            'price_cents' => 5000,
            'currency' => 'ETB',
            'status' => $status,
        ]);
        $file = FileEntry::query()->create([
            'name' => 'download.pdf',
            'file_name' => Str::random(20),
            'file_size' => 1024,
            'mime' => 'application/pdf',
            'extension' => 'pdf',
            'type' => 'file',
            'workspace_id' => $workspace->id,
            'owner_id' => $creator->id,
        ]);
        $product->files()->attach($file->id);

        return $product;
    }

    private function createLinkImage(
        User $owner,
        Workspace $workspace,
        string $name,
    ): FileEntry {
        return FileEntry::query()->create([
            'name' => $name,
            'file_name' => Str::uuid() . '.jpg',
            'file_size' => 1024,
            'mime' => 'image/jpeg',
            'extension' => 'jpg',
            'type' => 'image',
            'public' => true,
            'upload_type' => 'linkImages',
            'workspace_id' => $workspace->id,
            'owner_id' => $owner->id,
        ]);
    }

    /** @return array<string, mixed> */
    private function validProfilePayload(): array
    {
        return [
            'display_name' => 'Nate Creator',
            'profile_title' => 'Product designer',
            'bio' => 'Independent creator.',
            'about_html' => '<p>I make practical digital products.</p>',
            'available_for_work' => true,
            'skills' => ['Laravel', 'React'],
            'contact_url' => 'creator@example.test',
            'social_links' => ['instagram' => '@creator'],
        ];
    }

    /** @param array<string, mixed> $attributes */
    private function createBiolink(array $attributes): Biolink
    {
        return Biolink::query()->create([
            'name' => 'Creator page ' . Str::random(8),
            'back_half' => Str::random(8),
            ...$attributes,
        ]);
    }
}
