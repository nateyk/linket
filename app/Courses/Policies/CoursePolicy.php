<?php

namespace App\Courses\Policies;

use App\Courses\Models\Course;
use App\Models\User;

class CoursePolicy
{
    public function manage(User $user, Course $course): bool
    {
        $product = $course->product;
        return $product && $product->user_id === $user->id;
    }

    public function preview(User $user, Course $course): bool
    {
        return $this->manage($user, $course) || $user->hasPermission('admin.access');
    }
}
