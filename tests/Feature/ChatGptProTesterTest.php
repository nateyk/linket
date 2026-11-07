<?php

use App\CreatorAi\Services\CreatorAiAccess;
use App\CreatorAi\Support\ChatGptProTester;
use App\Models\User;
use App\Payments\Models\ProSubscriptionPayment;
use Common\Billing\Models\Price;
use Common\Billing\Models\Product;
use Common\Billing\Subscription;
use Common\Workspaces\Models\Workspace;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;

uses(DatabaseTransactions::class);

afterEach(function () {
    Config::set('creator_ai.test_pro_email');
    Config::set('creator_ai.test_pro_password');
});

test('a missing test account setting creates no user', function () {
    expect(app(ChatGptProTester::class)->seed())->toBe('skipped');
    expect(User::query()->where('username', 'chatgpt-tester')->exists())->toBeFalse();
});

test('an email that already belongs to someone else is left unchanged', function () {
    setChatGptTesterEnv();
    User::factory()->create(['email' => 'chatgpt-tester@example.test']);

    expect(app(ChatGptProTester::class)->seed())->toBe('existing_account');
    expect(ProSubscriptionPayment::query()->where('creator_id', User::query()->where('email', 'chatgpt-tester@example.test')->value('id'))->exists())->toBeFalse();
});

test('the configured account becomes a current verified Pro creator', function () {
    setChatGptTesterEnv();
    ensureChatGptProPlan();

    expect(app(ChatGptProTester::class)->seed())->toBe('seeded');

    $user = User::query()->where('email', 'chatgpt-tester@example.test')->firstOrFail();
    expect(app(CreatorAiAccess::class)->verifiedPro($user))->toBeTrue()
        ->and(Workspace::query()->where('owner_id', $user->id)->where('is_personal', true)->exists())->toBeTrue();

    expect(app(ChatGptProTester::class)->seed())->toBe('seeded');
    expect(Subscription::query()->where('user_id', $user->id)->where('gateway_name', 'verify_et')->count())->toBe(1);
    expect(ProSubscriptionPayment::query()->where('creator_id', $user->id)->count())->toBe(1);
});

function setChatGptTesterEnv(): void
{
    Config::set('creator_ai.test_pro_email', 'chatgpt-tester@example.test');
    Config::set('creator_ai.test_pro_password', 'chatgpt-test-pass');
}

function ensureChatGptProPlan(): void
{
    $product = Product::query()->where('system_key', 'pro')->first();
    if (! $product) {
        $product = Product::query()->create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Pro',
            'free' => false,
            'is_default' => false,
            'active' => true,
            'system_key' => 'pro',
        ]);
    }

    if (! Price::query()->where('product_id', $product->id)->where('currency', 'ETB')->exists()) {
        Price::query()->create([
            'product_id' => $product->id,
            'amount' => 500,
            'currency' => 'ETB',
            'interval' => 'month',
            'interval_count' => 1,
        ]);
    }
}
