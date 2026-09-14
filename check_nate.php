<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$user = App\Models\User::where('email','nateanon777@gmail.com')->first();
if(!$user){ echo "user not found\n"; exit; }
echo "user {$user->id} {$user->email}\n";
$ws = Common\Workspaces\Models\Workspace::forUser($user->id)->first();
echo "workspace ".($ws? $ws->id : 'none')."\n";
use App\Storefront\Models\DigitalProduct;
$p = DigitalProduct::where('user_id',$user->id)->orderBy('id','desc')->first();
if($p){ echo "latest product {$p->id} title ".json_encode($p->title)." status {$p->status}\n"; $c=$p->course; if($c){ echo "course {$c->id} lessons ".App\Courses\Models\Lesson::where('course_id',$c->id)->count()."\n"; foreach(App\Courses\Models\Lesson::where('course_id',$c->id)->get() as $l) echo " lesson {$l->id} type {$l->content_type} content ".json_encode(mb_substr($l->content??'',0,80))."\n"; } }
