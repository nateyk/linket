import {fetchPortalCourseLearn} from '@app/digital-products/public/my-portal-api';
import {MyPortalShell} from '@app/digital-products/public/my-portal-shell';
import {Alert} from '@shadcn/alert/alert';
import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Progress} from '@shadcn/progress/progress';
import {Separator} from '@shadcn/separator';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CheckIcon,
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
        <Button className="w-fit" render={<Link to="/my-portal" />}>
          <Trans message="Back to My Portal" />
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            render={<Link to="/my-portal" />}
          >
            <ArrowLeftIcon />
            <span className="hidden sm:inline">
              <Trans message="My Portal" />
            </span>
          </Button>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <h1 className="truncate text-sm font-medium sm:text-base">
            {course.product.title}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {course.product.cover?.url ? (
              <Card.Root className="gap-0 overflow-hidden py-0 shadow-none">
                <div className="relative aspect-video bg-muted">
                  <img
                    src={course.product.cover.url}
                    alt={course.product.title}
                    className="size-full object-cover"
                  />
                </div>
              </Card.Root>
            ) : null}

            <Card.Root className="shadow-none">
              <Card.Header>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Card.Title className="text-xl font-bold sm:text-2xl">
                    {course.product.title}
                  </Card.Title>
                  <Badge variant="secondary">
                    <BookOpenIcon />
                    <Trans
                      message=":count lessons"
                      values={{count: course.progress.total}}
                    />
                  </Badge>
                </div>
              </Card.Header>
              <Card.Content className="flex flex-col gap-5">
                {course.product.description ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {course.product.description}
                  </p>
                ) : null}

                {outcomes.length ? (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-3">
                      <h3 className="font-semibold">
                        <Trans message="What you'll learn" />
                      </h3>
                      <ul className="flex flex-col gap-2">
                        {outcomes.map(outcome => (
                          <li
                            key={outcome}
                            className="flex items-start gap-2.5 text-sm"
                          >
                            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <CheckIcon className="size-2.5" />
                            </span>
                            <span className="text-muted-foreground">
                              {outcome}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : null}
              </Card.Content>
            </Card.Root>

            {course.instructor ? (
              <Card.Root className="shadow-none">
                <Card.Header>
                  <Card.Title className="text-base">
                    <Trans message="Instructor" />
                  </Card.Title>
                </Card.Header>
                <Card.Content>
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
                      <h3 className="font-semibold">{course.instructor.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        <Trans message="Course instructor" />
                      </p>
                    </div>
                  </div>
                </Card.Content>
              </Card.Root>
            ) : null}

            <div className="lg:hidden">
              <CurriculumCard
                course={course}
                unlockedLessonIds={unlockedLessonIds}
                continueTo={continueTo}
                isComplete={isComplete}
              />
            </div>
          </div>

          <div className="hidden lg:col-span-1 lg:block">
            <div className="sticky top-20">
              <CurriculumCard
                course={course}
                unlockedLessonIds={unlockedLessonIds}
                continueTo={continueTo}
                isComplete={isComplete}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CurriculumCard({
  course,
  unlockedLessonIds,
  continueTo,
  isComplete,
}: {
  course: CourseData;
  unlockedLessonIds: number[];
  continueTo: string;
  isComplete: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card.Root className="shadow-none">
        <Card.Content className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <Trans
                message=":completed of :total completed"
                values={{
                  completed: course.progress.completed,
                  total: course.progress.total,
                }}
              />
              <span>{course.progress.percent}%</span>
            </div>
            <Progress.Root value={course.progress.percent}>
              <Progress.Track className="h-1.5">
                <Progress.Indicator />
              </Progress.Track>
            </Progress.Root>
          </div>
          <Button
            size="lg"
            className="w-full"
            render={<Link to={continueTo} />}
          >
            <PlayIcon />
            {isComplete ? (
              <Trans message="Review course" />
            ) : (
              <Trans message="Continue learning" />
            )}
          </Button>
        </Card.Content>
      </Card.Root>

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
        </Card.Header>
        <Card.Content className="p-0">
          <div className="max-h-[420px] overflow-y-auto">
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
    </div>
  );
}
