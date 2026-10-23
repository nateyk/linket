import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Progress} from '@shadcn/progress/progress';
import {Toggle} from '@shadcn/toggle';
import {ToggleGroup} from '@shadcn/toggle-group/toggle-group';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  GraduationCapIcon,
  PlayIcon,
} from 'lucide-react';
import type {ReactNode} from 'react';
import {Link} from 'react-router';

export type PortalCourse = {
  course_id: number;
  title: string;
  cover?: {url: string} | null;
  creator_name?: string | null;
  total_lessons: number;
  percent: number;
  /** Completed published lessons (from API). */
  lessons_done?: number;
  /** @deprecated Prefer lessons_done */
  completed?: number;
  next_lesson_id?: number | null;
  next_lesson_title?: string | null;
  completed_at?: string | null;
  /** Sample layout row — not a real enrollment. */
  is_demo?: boolean;
};

export function courseLessonsDone(course: PortalCourse): number {
  if (typeof course.lessons_done === 'number') {
    return Math.min(
      course.total_lessons,
      Math.max(0, course.lessons_done),
    );
  }
  if (typeof course.completed === 'number') {
    return Math.min(course.total_lessons, Math.max(0, course.completed));
  }
  return estimateLessonsDone(course.percent, course.total_lessons);
}

export type CourseFilter = 'all' | 'in_progress' | 'completed';

export function courseHref(course: PortalCourse): string {
  if (course.is_demo) {
    return '#portal-courses';
  }
  return course.next_lesson_id
    ? `/my-portal/courses/${course.course_id}/lessons/${course.next_lesson_id}`
    : `/my-portal/courses/${course.course_id}`;
}

export function isCourseComplete(course: PortalCourse): boolean {
  return course.percent === 100 || !!course.completed_at;
}

/** Approximate completed lessons from progress % until the API exposes a count. */
export function estimateLessonsDone(
  percent: number,
  totalLessons: number,
): number {
  if (totalLessons <= 0 || percent <= 0) {
    return 0;
  }
  return Math.min(
    totalLessons,
    Math.max(0, Math.round((percent / 100) * totalLessons)),
  );
}

export function filterCourses(
  courses: PortalCourse[],
  filter: CourseFilter,
): PortalCourse[] {
  return courses.filter(course => {
    if (filter === 'in_progress') {
      return course.percent > 0 && course.percent < 100 && !course.completed_at;
    }
    if (filter === 'completed') {
      return isCourseComplete(course);
    }
    return true;
  });
}

export function continueCourses(courses: PortalCourse[]): PortalCourse[] {
  return courses
    .filter(course => !isCourseComplete(course) && course.percent > 0)
    .slice(0, 3);
}

export function PortalPageHeader({subtitle}: {subtitle?: ReactNode}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        <Trans message="My Portal" />
      </h1>
      <p className="text-sm text-muted-foreground">
        {subtitle ?? (
          <Trans message="Access everything you purchased — courses and downloads." />
        )}
      </p>
    </div>
  );
}

export function PortalCourseFilters({
  value,
  onChange,
}: {
  value: CourseFilter;
  onChange: (next: CourseFilter) => void;
}) {
  return (
    <ToggleGroup
      variant="segmented"
      buttonVariant="outline"
      value={[value]}
      onValueChange={next => {
        const selected = next[0] as CourseFilter | undefined;
        if (selected) {
          onChange(selected);
        }
      }}
      aria-label="Filter purchased courses"
    >
      <Toggle value="all">
        <Trans message="All" />
      </Toggle>
      <Toggle value="in_progress">
        <Trans message="In progress" />
      </Toggle>
      <Toggle value="completed">
        <Trans message="Completed" />
      </Toggle>
    </ToggleGroup>
  );
}

export function PortalContinueStrip({courses}: {courses: PortalCourse[]}) {
  if (!courses.length) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight">
        <Trans message="Continue learning" />
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {courses.map(course => (
          <Card.Root
            key={`continue-${course.course_id}`}
            className="gap-0 overflow-hidden py-0 transition-shadow hover:shadow-sm"
          >
            <div className="flex gap-3 p-3">
              <div className="size-16 shrink-0 overflow-hidden rounded-card-xs bg-muted">
                {course.cover?.url ? (
                  <img
                    src={course.cover.url}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-foreground">
                    <GraduationCapIcon className="size-5" />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="line-clamp-2 text-sm font-semibold">{course.title}</p>
                <Progress.Root value={course.percent}>
                  <Progress.Track className="h-1.5">
                    <Progress.Indicator />
                  </Progress.Track>
                </Progress.Root>
                <Button
                  size="sm"
                  className="w-fit"
                  render={<Link to={courseHref(course)} />}
                >
                  <PlayIcon />
                  <Trans message="Continue" />
                </Button>
              </div>
            </div>
          </Card.Root>
        ))}
      </div>
    </section>
  );
}

export function PortalCourseCard({course}: {course: PortalCourse}) {
  const complete = isCourseComplete(course);
  const inProgress = !complete && course.percent > 0;
  const href = courseHref(course);
  const lessonsDone = courseLessonsDone(course);
  const cta = complete ? (
    <Trans message="Review course" />
  ) : inProgress ? (
    <Trans message="Continue" />
  ) : (
    <Trans message="Open" />
  );

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-card border border-border bg-card sm:flex-row',
      )}
    >
      <div className="relative aspect-video w-full shrink-0 bg-muted sm:w-64 sm:self-stretch sm:aspect-auto">
        {course.cover?.url ? (
          <img
            src={course.cover.url}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full min-h-36 items-center justify-center text-muted-foreground">
            <GraduationCapIcon className="size-8" aria-hidden="true" />
          </div>
        )}
        {course.is_demo ? (
          <span className="absolute top-3 left-3 rounded-button bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
            <Trans message="Sample" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
            {complete ? (
              <span className="inline-flex items-center gap-1 text-foreground">
                <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
                <Trans message="Completed" />
              </span>
            ) : inProgress ? (
              <Trans message="In progress" />
            ) : (
              <Trans message="Not started" />
            )}
            {course.creator_name ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">
                  <Trans
                    message="by :name"
                    values={{name: course.creator_name}}
                  />
                </span>
              </>
            ) : (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  <Trans
                    message=":count lessons"
                    values={{count: course.total_lessons}}
                  />
                </span>
              </>
            )}
          </div>
          <h3 className="text-pretty font-semibold leading-snug">
            {course.title}
          </h3>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <Trans
                message=":done/:total lessons"
                values={{done: lessonsDone, total: course.total_lessons}}
              />
            </span>
            <span className="tabular-nums">{course.percent}%</span>
          </div>
          <Progress.Root
            value={course.percent}
            aria-label={`${course.title} progress`}
          >
            <Progress.Track className="h-1.5">
              <Progress.Indicator />
            </Progress.Track>
          </Progress.Root>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {complete ? (
              <Trans message="Course complete" />
            ) : course.next_lesson_title ? (
              <Trans
                message="Up next: :title"
                values={{title: course.next_lesson_title}}
              />
            ) : inProgress ? (
              <Trans message="Continue where you left off" />
            ) : (
              <Trans message="Ready to start" />
            )}
          </p>
          {course.is_demo ? (
            <Button size="sm" variant="outline" disabled>
              {cta}
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant={complete ? 'outline' : 'default'}
              render={<Link to={href} />}
            >
              {inProgress ? <PlayIcon data-icon="inline-start" /> : null}
              {cta}
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function PortalCourseGrid({courses}: {courses: PortalCourse[]}) {
  if (!courses.length) {
    return (
      <p className="text-sm text-muted-foreground">
        <Trans message="No courses match this filter." />
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {courses.map(course => (
        <PortalCourseCard key={course.course_id} course={course} />
      ))}
    </div>
  );
}
