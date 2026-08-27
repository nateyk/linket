import {MyOrderShell} from '@app/digital-products/public/my-order-shell';
import {Alert} from '@shadcn/alert/alert';
import {Accordion} from '@shadcn/accordion/accordion';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Progress} from '@shadcn/progress/progress';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {CheckCircle2Icon, LockIcon, PlayIcon} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link, useParams} from 'react-router';

type CourseData = {
  id: number;
  product: {title: string; cover?: {url: string} | null};
  chapters: {
    id: number;
    title: string;
    lessons: {id: number; title: string; status: string}[];
  }[];
  progress: {
    total: number;
    completed: number;
    percent: number;
    completed_lesson_ids: number[];
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
        const res = await fetch(`/api/v1/courses/${courseId}/learn`, {
          credentials: 'same-origin',
          headers: {Accept: 'application/json'},
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        const payload = await res.json();
        setCourse(payload.data);
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
      <MyOrderShell wide>
        <div className="flex min-h-64 items-center justify-center">
          <Spinner />
        </div>
      </MyOrderShell>
    );
  }

  if (error || !course) {
    return (
      <MyOrderShell wide>
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
        <Button className="w-fit" render={<Link to="/my-order" />}>
          <Trans message="Back to my orders" />
        </Button>
      </MyOrderShell>
    );
  }

  return (
    <MyOrderShell wide>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Trans message="My course" />
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {course.product.title}
          </h1>
        </div>
        <Button size="sm" variant="outline" render={<Link to="/my-order" />}>
          <Trans message="My orders" />
        </Button>
      </div>
      <div className="flex flex-col gap-6">
        {course.product.cover?.url && (
          <div className="overflow-hidden rounded-card">
            <img
              src={course.product.cover.url}
              alt={course.product.title}
              className="aspect-video w-full object-cover"
            />
          </div>
        )}
        <Card.Root className="gap-0 py-0">
          <Card.Content className="p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>
                <Trans
                  message="Completed :completed of :total lessons"
                  values={{
                    completed: course.progress.completed,
                    total: course.progress.total,
                  }}
                />
              </span>
              <span>{course.progress.percent}%</span>
            </div>
            <Progress.Root value={course.progress.percent}>
              <Progress.Track className="h-1.5">
                <Progress.Indicator />
              </Progress.Track>
            </Progress.Root>
          </Card.Content>
        </Card.Root>

        <div className="flex flex-col gap-3">
          <h3 className="font-semibold">
            <Trans message="Course content" />
          </h3>
          <p className="text-sm text-muted-foreground">
            {course.chapters.length} chapters • {course.progress.total} lessons
          </p>
          <Accordion.Root className="flex flex-col gap-3">
            {course.chapters.map(chapter => (
              <Accordion.Item
                key={chapter.id}
                value={String(chapter.id)}
                className="rounded-card border bg-card"
              >
                <Accordion.Trigger className="px-4">
                  <span className="font-medium">{chapter.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {chapter.lessons.length} lessons
                  </span>
                </Accordion.Trigger>
                <Accordion.Content className="flex flex-col gap-1 px-2 pb-2">
                  {chapter.lessons.map(lesson => {
                    const completed =
                      course.progress.completed_lesson_ids.includes(lesson.id);
                    const isPublished = lesson.status === 'published';
                    return (
                      <Link
                        key={lesson.id}
                        to={
                          isPublished
                            ? `/my-order/courses/${course.id}/lessons/${lesson.id}`
                            : '#'
                        }
                        className={`flex items-center gap-2 rounded-card border p-3 text-sm ${completed ? 'bg-positive/5' : 'bg-background hover:bg-muted/30'} ${!isPublished ? 'pointer-events-none opacity-60' : ''}`}
                      >
                        {completed ? (
                          <CheckCircle2Icon className="size-4 text-positive" />
                        ) : !isPublished ? (
                          <LockIcon className="size-4 text-muted-foreground" />
                        ) : (
                          <PlayIcon className="size-4 text-muted-foreground" />
                        )}
                        <span className="flex-1">{lesson.title}</span>
                        {!isPublished && (
                          <Badge variant="outline" className="text-[10px]">
                            <Trans message="Draft" />
                          </Badge>
                        )}
                      </Link>
                    );
                  })}
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </div>
    </MyOrderShell>
  );
}
