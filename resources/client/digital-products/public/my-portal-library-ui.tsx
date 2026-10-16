import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Progress} from '@shadcn/progress/progress';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {GraduationCapIcon, PlayIcon} from 'lucide-react';
import type {ReactNode} from 'react';
import {Link} from 'react-router';

export type PortalCourse = {
  course_id: number;
  title: string;
  cover?: {url: string} | null;
  total_lessons: number;
  percent: number;
  next_lesson_id?: number | null;
  completed_at?: string | null;
  /** Sample layout row — not a real enrollment. */
  is_demo?: boolean;
};

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
    <div
      className="flex flex-wrap gap-4"
      role="tablist"
      aria-label="Filter purchased courses"
    >
      {(
        [
          ['all', 'All'],
          ['in_progress', 'In progress'],
          ['completed', 'Completed'],
        ] as const
      ).map(([id, label]) => (
        <Button
          key={id}
          size="sm"
          variant={value === id ? 'default' : 'outline'}
          onClick={() => onChange(id)}
          role="tab"
          aria-selected={value === id}
        >
          <Trans message={label} />
        </Button>
      ))}
    </div>
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
            className="gap-0 overflow-hidden py-0 transition-shadow hover:ring-1 hover:ring-primary/30"
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
  const href = courseHref(course);
  const cta = complete ? (
    <Trans message="Open" />
  ) : course.percent > 0 ? (
    <Trans message="Continue" />
  ) : (
    <Trans message="Open" />
  );

  const card = (
    <Card.Root
      className={cn(
        'group relative h-full gap-0 overflow-hidden border-none pt-0',
        'transition-shadow hover:ring-1 hover:ring-primary/30',
      )}
    >
      <span className="sr-only">{course.title}</span>
      <div className="relative overflow-hidden rounded-t-xl bg-muted">
        {course.cover?.url ? (
          <img
            src={course.cover.url}
            alt={course.title}
            className="h-auto max-h-48 w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center text-muted-foreground">
            <GraduationCapIcon className="size-8" />
          </div>
        )}
        {course.is_demo ? (
          <Badge variant="secondary" className="absolute top-3 left-3 z-10">
            <Trans message="Sample" />
          </Badge>
        ) : null}
      </div>
      <Card.Content className="flex flex-col gap-4 px-4 pt-4">
        <h3 className="max-w-[90%] text-xl font-medium">{course.title}</h3>
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            {complete ? (
              <Badge variant="secondary">
                <Trans message="Completed" />
              </Badge>
            ) : course.percent > 0 ? (
              <Badge variant="outline">
                <Trans message="In progress" />
              </Badge>
            ) : (
              <Badge variant="outline">
                <Trans message="Not started" />
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              <Trans
                message=":count lessons"
                values={{count: course.total_lessons}}
              />
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Trans
              message=":percent% complete"
              values={{percent: course.percent}}
            />
            <span className="tabular-nums">{course.percent}%</span>
          </div>
          <Progress.Root value={course.percent}>
            <Progress.Track className="h-1.5">
              <Progress.Indicator />
            </Progress.Track>
          </Progress.Root>
        </div>
      </Card.Content>
      <Card.Content className="mt-auto px-4 pb-4">
        <div
          className={cn(
            'inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium',
            'bg-primary/10 text-secondary-foreground transition-colors duration-300',
            'group-hover:bg-primary group-hover:text-primary-foreground',
            course.is_demo && 'opacity-60',
          )}
        >
          <PlayIcon className="size-4" />
          {cta}
        </div>
      </Card.Content>
    </Card.Root>
  );

  if (course.is_demo) {
    return <div className="block h-full">{card}</div>;
  }

  return (
    <Link to={href} className="block h-full">
      {card}
    </Link>
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
    <div className="grid gap-5 lg:grid-cols-2">
      {courses.map(course => (
        <PortalCourseCard key={course.course_id} course={course} />
      ))}
    </div>
  );
}
