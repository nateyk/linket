<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class MyOrderCourseRoutesTest extends TestCase
{
    public function test_nested_course_pages_are_served_by_the_my_order_portal(): void
    {
        $uris = collect(Route::getRoutes()->getRoutesByMethod()['GET'])
            ->map(fn ($route) => $route->uri());

        $this->assertContains('my-portal/courses/{courseId}', $uris);
        $this->assertContains('my-portal/courses/{courseId}/lessons/{lessonId}', $uris);
        $this->assertNotContains('dashboard/my-courses', $uris);
        $this->assertNotContains('dashboard/learn/{courseId}', $uris);

        $this->get('/my-portal/courses/1')->assertOk();
        $this->get('/my-portal/courses/1/lessons/2')->assertOk();
        $this->get('/my-order')->assertRedirect('/my-portal');
    }
}
