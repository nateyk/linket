<?php

it('default menus point to stores', function(){
 $menus = json_decode((collect(require 'resources/defaults/default-settings.php')->firstWhere('name','menus')['value']), true);
 $primary = collect($menus)->firstWhere('positions.0','dashboard-primary');
 expect(collect($primary['items'])->pluck('action'))->toContain('/dashboard/stores');
});

it('default menus point product entries at the renamed items paths', function(){
 $menus = json_decode((collect(require 'resources/defaults/default-settings.php')->firstWhere('name','menus')['value']), true);
 $allActions = collect($menus)->flatMap(fn($m) => collect($m['items'] ?? [])->pluck('action'));
 expect($allActions)->toContain('/dashboard/items');
 expect($allActions)->toContain('/admin/items');
 expect($allActions)->not->toContain('/dashboard/my-products');
 expect($allActions)->not->toContain('/admin/digital-products');

 $allLabels = collect($menus)->flatMap(fn($m) => collect($m['items'] ?? [])->pluck('label'));
 expect($allLabels)->toContain('My Items');
 expect($allLabels)->toContain('Items');
 expect($allLabels)->not->toContain('My Products');
 expect($allLabels)->not->toContain('Digital Products');
});
