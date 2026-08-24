<?php

it('default menus point to stores', function(){
 $menus = json_decode((collect(require 'resources/defaults/default-settings.php')->firstWhere('name','menus')['value']), true);
 $primary = collect($menus)->firstWhere('positions.0','dashboard-primary');
 expect(collect($primary['items'])->pluck('action'))->toContain('/dashboard/stores');
});
