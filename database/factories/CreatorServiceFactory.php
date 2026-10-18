<?php

namespace Database\Factories;

use App\Biolinks\Models\Biolink;
use App\CreatorServices\Models\CreatorService;
use App\Models\User;
use Common\Workspaces\Actions\CreateWorkspace;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class CreatorServiceFactory extends Factory
{
    protected $model = CreatorService::class;

    public function definition(): array
    {
        $token = Str::lower(Str::random(12));

        $creator = User::query()->forceCreate([
            'name' => 'Creator '.$token,
            'username' => $token,
            'email' => "{$token}@example.test",
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        $workspace = (new CreateWorkspace())->createPersonalWorkspace($creator);
        $store = Biolink::query()->create([
            'back_half' => Str::random(8),
            'name' => 'Storefront '.$token,
            'user_id' => $creator->id,
            'workspace_id' => $workspace->id,
        ]);

        return [
            'workspace_id' => $workspace->id,
            'user_id' => $creator->id,
            'store_id' => $store->id,
            'title' => fake()->sentence(3),
            'slug' => 'service-'.Str::lower(Str::random(8)),
            'status' => 'draft',
            'currency' => 'ETB',
        ];
    }

    public function published(): static
    {
        return $this->state(fn (): array => ['status' => 'published']);
    }

    public function forStore(Biolink $store): static
    {
        return $this->state(fn (): array => [
            'store_id' => $store->id,
            'user_id' => $store->user_id,
            'workspace_id' => $store->workspace_id,
        ]);
    }
}
