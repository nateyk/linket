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

    public function view(User $user, Course $course): bool
    {
        // Allow if instructor or product owner matches authenticated user
        if ($course->instructor_user_id !== null && (int) $course->instructor_user_id === (int) $user->id) {
            return true;
        }

        return $this->manage($user, $course);
    }

    public function update(User $user, Course $course): bool
    {
        return $this->view($user, $course);
    }
}
