<?php

use App\Stores\Models\Store;
use App\Models\User;

it('exposes canonical stores route and keeps legacy with deprecation', function () {
    $user = User::factory()->create();
    $workspace = $user->workspaces()->first() ?? \Common\Workspaces\Models\Workspace::factory()->create(['owner_id'=>$user->id]);
    $store = Store::factory()->create(['workspace_id'=>$workspace->id,'user_id'=>$user->id]);
    $this->actingAs($user);

    $canonical = $this->withHeader('Referer', 'http://localhost')->getJson('/api/v1/stores/'.$store->id);
    $canonical->assertOk()->assertJsonPath('data.model_type','store');

    $legacy = $this->withHeader('Referer', 'http://localhost')->getJson('/api/v1/biolinks/'.$store->id);
    $legacy->assertOk()->assertHeader('Deprecation','true');
});
