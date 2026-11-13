<?php

namespace Tests\Feature;

use App\HelpCenter\Models\HcArticle;
use App\HelpCenter\Models\HcCategory;
use App\Models\User;
use Common\Permissions\Models\Permission;
use Common\Roles\Models\Role;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class HcArticleFeedbackIntegrityTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        $guests = Role::query()->firstOrCreate(
            ['guests' => true],
            ['name' => 'Guests', 'type' => 'users', 'internal' => true, 'default' => false],
        );
        $permission = Permission::query()->firstOrCreate(['name' => 'articles.view']);
        $guests->permissions()->syncWithoutDetaching([$permission->id]);
        app()->forgetInstance('guestRole');
    }

    public function test_guest_updates_their_own_vote_without_storing_an_ip(): void
    {
        $article = $this->article();

        $token = bin2hex(random_bytes(32));
        $first = $this->stateful()
            ->withCookie('hc_feedback_visitor', $token)
            ->postJson("/api/v1/hc/articles/{$article->id}/feedback", [
                'wasHelpful' => true,
            ])->assertOk();

        $cookie = collect($first->headers->getCookies())
            ->first(fn ($candidate) => $candidate->getName() === 'hc_feedback_visitor');
        $this->assertNotNull($cookie);
        $this->assertTrue($cookie->isHttpOnly());

        // withCookie encrypts the supplied raw value for the test request.
        // Replaying the encrypted response value would double-encrypt it.
        $this->withCookie('hc_feedback_visitor', $token)
            ->postJson("/api/v1/hc/articles/{$article->id}/feedback", [
                'wasHelpful' => false,
                'comment' => 'This could be clearer.',
            ])->assertOk();

        $this->assertSame(1, $article->feedback()->count());
        $this->assertDatabaseHas('article_feedback', [
            'article_id' => $article->id,
            'was_helpful' => false,
            'comment' => 'This could be clearer.',
            'ip' => null,
            'user_id' => null,
        ]);
        $this->assertNotNull($article->feedback()->first()->visitor_token_hash);
    }

    public function test_separate_guest_browsers_behind_the_same_ip_keep_separate_votes(): void
    {
        $article = $this->article();

        $this->stateful()->postJson("/api/v1/hc/articles/{$article->id}/feedback", [
            'wasHelpful' => true,
        ])->assertOk();

        // A malformed or missing cookie represents a separate browser, even
        // though both requests have the same test-client IP address.
        $this->withCookie('hc_feedback_visitor', 'invalid-token')
            ->postJson("/api/v1/hc/articles/{$article->id}/feedback", [
                'wasHelpful' => false,
            ])->assertOk();

        $this->assertSame(2, $article->feedback()->count());
        $this->assertSame(1, $article->feedback()->where('was_helpful', true)->count());
        $this->assertSame(1, $article->feedback()->where('was_helpful', false)->count());
    }

    public function test_authenticated_users_never_overwrite_another_users_vote_via_shared_ip(): void
    {
        $article = $this->article();
        $first = $this->userWithViewPermission();
        $second = $this->userWithViewPermission();

        $this->stateful()->actingAs($first)
            ->postJson("/api/v1/hc/articles/{$article->id}/feedback", [
                'wasHelpful' => true,
            ])->assertOk();
        $this->actingAs($second)
            ->postJson("/api/v1/hc/articles/{$article->id}/feedback", [
                'wasHelpful' => false,
            ])->assertOk();
        $this->actingAs($first)
            ->postJson("/api/v1/hc/articles/{$article->id}/feedback", [
                'wasHelpful' => false,
            ])->assertOk();

        $this->assertSame(2, $article->feedback()->count());
        $this->assertDatabaseHas('article_feedback', [
            'article_id' => $article->id,
            'user_id' => $first->id,
            'was_helpful' => false,
            'ip' => null,
        ]);
        $this->assertDatabaseHas('article_feedback', [
            'article_id' => $article->id,
            'user_id' => $second->id,
            'was_helpful' => false,
            'ip' => null,
        ]);
    }

    public function test_feedback_does_not_bypass_draft_authorization_or_validation(): void
    {
        $draft = $this->article(true);
        $published = $this->article();

        $this->stateful()->postJson("/api/v1/hc/articles/{$draft->id}/feedback", [
            'wasHelpful' => true,
        ])->assertForbidden();

        $this->postJson("/api/v1/hc/articles/{$published->id}/feedback", [
            'wasHelpful' => 'not-a-boolean',
        ])->assertUnprocessable();
        $this->postJson("/api/v1/hc/articles/{$published->id}/feedback", [
            'wasHelpful' => true,
            'comment' => str_repeat('a', 1001),
        ])->assertUnprocessable();

        $this->assertSame(0, $draft->feedback()->count());
        $this->assertSame(0, $published->feedback()->count());
    }

    private function article(bool $draft = false): HcArticle
    {
        $root = HcCategory::query()->create([
            'name' => 'Feedback root '.Str::random(8),
            'position' => 1,
        ]);
        $section = HcCategory::query()->create([
            'name' => 'Feedback section '.Str::random(8),
            'parent_id' => $root->id,
            'position' => 1,
        ]);
        $article = HcArticle::query()->create([
            'title' => 'Feedback article '.Str::random(8),
            'slug' => Str::lower(Str::random(16)),
            'body' => '<p>Help content</p>',
            'draft' => $draft,
        ]);
        $article->categories()->attach([
            $root->id => ['position' => 1],
            $section->id => ['position' => 1],
        ]);

        return $article;
    }

    private function userWithViewPermission(): User
    {
        $user = User::factory()->create();
        $permission = Permission::query()->firstOrCreate(['name' => 'articles.view']);
        $user->permissions()->syncWithoutDetaching([$permission->id]);

        return $user;
    }

    private function stateful(): static
    {
        return $this->withSession(['_token' => 'hc-feedback-csrf'])
            ->withHeader('Referer', config('app.url'))
            ->withHeader('X-CSRF-TOKEN', 'hc-feedback-csrf');
    }
}
