import {fetchPortalCourseLearn} from '@app/digital-products/public/my-portal-api';
import {MyPortalShell} from '@app/digital-products/public/my-portal-shell';
import {Alert} from '@shadcn/alert/alert';
import {Avatar} from '@shadcn/avatar/avatar';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Progress} from '@shadcn/progress/progress';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CheckIcon,
  GraduationCapIcon,
  PlayIcon,
} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link, useParams} from 'react-router';
import {
  CourseCurriculumList,
  type CurriculumChapter,
} from './course-curriculum-list';

type CourseData = {
  id: number;
  require_sequential_completion?: boolean;
  next_lesson_id?: number | null;
  unlocked_lesson_ids?: number[];
  instructor?: {name: string; avatar_url?: string | null} | null;
  product: {
    title: string;
    description?: string | null;
    learning_outcomes?: string[] | null;
    cover?: {url: string} | null;
  };
  chapters: CurriculumChapter[];
  progress: {
    total: number;
    completed: number;
    percent: number;
    completed_lesson_ids: number[];
    unlocked_lesson_ids?: number[];
  };
};

export function Component() {
  const {courseId} = useParams();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    setCourse(null);
    setLoading(true);
    setError(undefined);

    void (async () => {
      try {
        const response = await fetchPortalCourseLearn(
          String(courseId),
          controller.signal,
        );
        setCourse(response.data.data);
      } catch {
        if (!controller.signal.aborted) {
          setError('Unable to load this course.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [courseId]);

  if (loading) {
    return (
      <MyPortalShell wide>
        <div className="flex min-h-64 items-center justify-center">
          <Spinner />
        </div>
      </MyPortalShell>
    );
  }

  if (error || !course) {
    return (
      <MyPortalShell wide>
        <Alert.Root variant="warning" fillStyle="subtleFill">
          <Alert.Title>
            <Trans message="Course unavailable" />
          </Alert.Title>
          <Alert.Description>
            {error ?? (
              <Trans message="This course was not found or is not included in your purchases." />
            )}
          </Alert.Description>
        </Alert.Root>
        <Button
          className="w-fit"
          render={<Link to="/my-portal?section=courses" />}
        >
          <Trans message="Back to My courses" />
        </Button>
      </MyPortalShell>
    );
  }

  const unlockedLessonIds =
    course.unlocked_lesson_ids ?? course.progress.unlocked_lesson_ids ?? [];
  const continueLessonId =
    course.next_lesson_id ??
    course.chapters.flatMap(chapter => chapter.lessons).find(lesson => {
      const unlocked =
        !course.require_sequential_completion ||
        unlockedLessonIds.includes(lesson.id);
      return (
        unlocked && !course.progress.completed_lesson_ids.includes(lesson.id)
      );
    })?.id;
  const continueTo = continueLessonId
    ? `/my-portal/courses/${course.id}/lessons/${continueLessonId}`
    : `/my-portal/courses/${course.id}`;
  const outcomes = (course.product.learning_outcomes ?? []).filter(Boolean);
  const isComplete =
    course.progress.percent === 100 ||
    (course.progress.total > 0 &&
      course.progress.completed >= course.progress.total);

  const curriculumPanel = (
    <Card.Root className="gap-0 overflow-hidden py-0 shadow-none">
      <Card.Header className="border-b py-4">
        <Card.Title className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <PlayIcon className="size-4 text-primary" />
            <Trans message="Course curriculum" />
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {course.progress.completed}/{course.progress.total}
          </span>
        </Card.Title>
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <Trans
              message=":percent% complete"
              values={{percent: course.progress.percent}}
            />
          </div>
          <Progress.Root
            value={course.progress.percent}
            aria-label={course.product.title}
          >
            <Progress.Track className="h-1.5">
              <Progress.Indicator />
            </Progress.Track>
          </Progress.Root>
        </div>
      </Card.Header>
      <Card.Content className="p-0">
        <div className="max-h-[480px] overflow-y-auto lg:max-h-[calc(100vh-14rem)]">
          <CourseCurriculumList
            courseId={course.id}
            chapters={course.chapters}
            completedLessonIds={course.progress.completed_lesson_ids}
            unlockedLessonIds={unlockedLessonIds}
            activeLessonId={course.next_lesson_id ?? undefined}
            requireSequential={course.require_sequential_completion}
          />
        </div>
      </Card.Content>
    </Card.Root>
  );

  return (
    <MyPortalShell wide>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <Link
            to="/my-portal?section=courses"
            className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            <Trans message="My courses" />
          </Link>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <Trans message="Course" />
                {course.instructor?.name
                  ? ` · ${course.instructor.name}`
                  : null}
              </p>
              <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {course.product.title}
              </h1>
              <p className="text-sm text-muted-foreground">
                <Trans
                  message=":count lessons"
                  values={{count: course.progress.total}}
                />
              </p>
            </div>
            <Button className="w-fit shrink-0" render={<Link to={continueTo} />}>
              <PlayIcon data-icon="inline-start" />
              {isComplete ? (
                <Trans message="Review course" />
              ) : (
                <Trans message="Continue learning" />
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="relative aspect-video overflow-hidden rounded-card border border-border bg-muted">
              {course.product.cover?.url ? (
                <img
                  src={course.product.cover.url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <GraduationCapIcon className="size-10" aria-hidden="true" />
                </div>
              )}
            </div>

            {course.product.description ? (
              <div className="rounded-card border border-border bg-card p-5">
                <h2 className="mb-2 font-semibold">
                  <Trans message="Overview" />
                </h2>
                <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                  {course.product.description}
                </p>
              </div>
            ) : null}

            {outcomes.length ? (
              <div className="rounded-card border border-border bg-card p-5">
                <h2 className="mb-3 flex items-center gap-2 font-semibold">
                  <BookOpenIcon className="size-4" aria-hidden="true" />
                  <Trans message="What you'll learn" />
                </h2>
                <ul className="flex flex-col gap-2">
                  {outcomes.map(outcome => (
                    <li
                      key={outcome}
                      className="flex items-start gap-2.5 text-sm"
                    >
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <CheckIcon className="size-2.5" />
                      </span>
                      <span className="text-muted-foreground">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {course.instructor ? (
              <div className="rounded-card border border-border bg-card p-5">
                <h2 className="mb-3 font-semibold">
                  <Trans message="Instructor" />
                </h2>
                <div className="flex gap-4">
                  <Avatar.Root className="size-14 shrink-0 rounded-xl">
                    {course.instructor.avatar_url ? (
                      <Avatar.Image
                        src={course.instructor.avatar_url}
                        alt={course.instructor.name}
                      />
                    ) : null}
                    <Avatar.Fallback className="rounded-xl text-sm font-semibold">
                      {course.instructor.name
                        .split(/\s+/)
                        .map(part => part[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold">{course.instructor.name}</p>
                    <p className="text-sm text-muted-foreground">
                      <Trans message="Course instructor" />
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="lg:hidden">{curriculumPanel}</div>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-6 flex flex-col gap-4">
              <Button
                size="lg"
                className="w-full"
                render={<Link to={continueTo} />}
              >
                <PlayIcon data-icon="inline-start" />
                {isComplete ? (
                  <Trans message="Review course" />
                ) : (
                  <Trans message="Continue learning" />
                )}
              </Button>
              {curriculumPanel}
            </div>
          </div>
        </div>
      </div>
    </MyPortalShell>
  );
}
