import {MyOrderShell} from '@app/digital-products/public/my-order-shell';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Spinner} from '@shadcn/spinner/spinner';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {apiClient} from '@common/http/query-client';
import {isAxiosError} from 'axios';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  LockIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link, useParams, useNavigate} from 'react-router';

type LessonData = {
  id: number;
  chapter_id: number;
  course_id: number;
  title: string;
  content?: string | null;
  video_type?: string | null;
  video_url?: string | null;
  video?: {url: string} | null;
  status: string;
  content_type?: 'video' | 'readable';
  resources: {
    id: number;
    display_name: string;
    file: {id: number; name: string};
  }[];
};

export function Component() {
  const {courseId, lessonId} = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [trial, setTrial] = useState(false);
  const [error, setError] = useState<string>();
  const [completing, setCompleting] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await apiClient.get(
          `/api/v1/courses/${courseId}/learn/lessons/${lessonId}`,
          {signal},
        );
        setLesson(response.data.data);
      } catch (reason) {
        if (isAxiosError(reason) && reason.response?.status === 403) {
          setTrial(true);
          return;
        }
        throw reason;
      }

      const response = await apiClient.get(
        `/api/v1/courses/${courseId}/learn`,
        {signal},
      );
      setCourse(response.data.data);
    },
    [courseId, lessonId],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLesson(null);
    setCourse(null);
    setTrial(false);
    setError(undefined);
    void load(controller.signal).catch(reason => {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError('Unable to load this lesson.');
      }
    });
    return () => controller.abort();
  }, [load]);

  const complete = async () => {
    setCompleting(true);
    try {
      await apiClient.post(`/api/v1/course-lessons/${lessonId}/complete`);
      if (course) {
        const flat = course.chapters.flatMap((ch: any) => ch.lessons);
        const idx = flat.findIndex((l: any) => l.id === Number(lessonId));
        const next = flat[idx + 1];
        if (next)
          navigate(`/my-order/courses/${courseId}/lessons/${next.id}`);
        else navigate(`/my-order/courses/${courseId}`);
      }
    } catch {
      setError('Unable to update lesson progress.');
    } finally {
      setCompleting(false);
    }
  };

  if (trial) {
    return (
      <MyOrderShell wide>
        <Alert.Root variant="warning" fillStyle="subtleFill">
          <LockIcon className="size-8 text-muted-foreground" />
          <Alert.Title>
            <Trans message="Lesson locked" />
          </Alert.Title>
          <Alert.Description>
            <Trans message="This lesson is locked. Complete previous lessons to unlock." />
          </Alert.Description>
        </Alert.Root>
        <Button
          className="w-fit"
          render={<Link to={`/my-order/courses/${courseId}`} />}
        >
          <Trans message="Back to course" />
        </Button>
      </MyOrderShell>
    );
  }

  if (error) {
    return (
      <MyOrderShell wide>
        <Alert.Root variant="warning" fillStyle="subtleFill">
          <Alert.Title>
            <Trans message="Lesson unavailable" />
          </Alert.Title>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
        <Button className="w-fit" render={<Link to="/my-order" />}>
          <Trans message="Back to my orders" />
        </Button>
      </MyOrderShell>
    );
  }

  if (!lesson) {
    return (
      <MyOrderShell wide>
        <div className="flex min-h-64 items-center justify-center">
          <Spinner />
        </div>
      </MyOrderShell>
    );
  }

  return (
    <MyOrderShell wide>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Trans message="Course lesson" />
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lesson.title}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link to={`/my-order/courses/${courseId}`} />}
        >
          <Trans message="Course" />
        </Button>
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {lesson.content_type === 'video' ? (
          <>
            {lesson.video_url && (
              <div className="aspect-video overflow-hidden rounded-card border bg-muted">
                <iframe
                  src={lesson.video_url}
                  className="size-full"
                  allowFullScreen
                  title={lesson.title}
                />
              </div>
            )}
            {lesson.video?.url && !lesson.video_url && (
              <div className="aspect-video overflow-hidden rounded-card border bg-muted">
                <video src={lesson.video.url} controls className="size-full" />
              </div>
            )}
            <Tabs.Root defaultValue="summary" className="w-full">
              <Tabs.List variant="line" className="w-full">
                <Tabs.Tab value="summary">
                  <Trans message="Summary" />
                </Tabs.Tab>
                <Tabs.Tab value="attachments">
                  <Trans message="Attachments" />
                </Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="summary">
                {lesson.content ? (
                  <Card.Root>
                    <Card.Content
                      className="prose prose-sm max-w-none p-6"
                      dangerouslySetInnerHTML={{__html: lesson.content}}
                    />
                  </Card.Root>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <Trans message="No summary added yet." />
                  </p>
                )}
              </Tabs.Panel>
              <Tabs.Panel value="attachments">
                {lesson.resources.length > 0 ? (
                  <Card.Root>
                    <Card.Header className="p-4">
                      <Card.Title className="text-sm">
                        <Trans message="Resources" />
                      </Card.Title>
                    </Card.Header>
                    <Card.Content className="flex flex-col gap-2 p-4 pt-0">
                      {lesson.resources.map(r => (
                        <a
                          key={r.id}
                          href={`/api/v1/course-lesson-resources/${r.id}/download`}
                          className="flex items-center gap-2 rounded-card border p-3 text-sm hover:bg-muted/30"
                        >
                          <DownloadIcon className="size-4" />
                          <span className="flex-1">{r.display_name}</span>
                        </a>
                      ))}
                    </Card.Content>
                  </Card.Root>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <Trans message="No attachments added yet." />
                  </p>
                )}
              </Tabs.Panel>
            </Tabs.Root>
          </>
        ) : (
          <>
            {lesson.content && (
              <Card.Root>
                <Card.Content
                  className="prose prose-sm max-w-none p-6"
                  dangerouslySetInnerHTML={{__html: lesson.content}}
                />
              </Card.Root>
            )}
            {!!lesson.resources.length && (
              <Card.Root>
                <Card.Header className="p-4">
                  <Card.Title className="text-sm">
                    <Trans message="Resources" />
                  </Card.Title>
                </Card.Header>
                <Card.Content className="flex flex-col gap-2 p-4 pt-0">
                  {lesson.resources.map(r => (
                    <a
                      key={r.id}
                      href={`/api/v1/course-lesson-resources/${r.id}/download`}
                      className="flex items-center gap-2 rounded-card border p-3 text-sm hover:bg-muted/30"
                    >
                      <DownloadIcon className="size-4" />
                      <span className="flex-1">{r.display_name}</span>
                    </a>
                  ))}
                </Card.Content>
              </Card.Root>
            )}
          </>
        )}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={completing}
            onClick={() => {
              if (course) {
                const flat = course.chapters.flatMap((ch: any) => ch.lessons);
                const idx = flat.findIndex(
                  (l: any) => l.id === Number(lessonId),
                );
                const prev = flat[idx - 1];
                if (prev)
                  navigate(`/my-order/courses/${courseId}/lessons/${prev.id}`);
              }
            }}
          >
            <ChevronLeftIcon />
            <Trans message="Previous" />
          </Button>
          <Button disabled={completing} onClick={() => void complete()}>
            {completing ? <Spinner /> : <CheckIcon />}
            <Trans message="Complete & Next" />
          </Button>
          <Button
            variant="outline"
            disabled={completing}
            onClick={() => {
              if (course) {
                const flat = course.chapters.flatMap((ch: any) => ch.lessons);
                const idx = flat.findIndex(
                  (l: any) => l.id === Number(lessonId),
                );
                const next = flat[idx + 1];
                if (next)
                  navigate(`/my-order/courses/${courseId}/lessons/${next.id}`);
              }
            }}
          >
            <Trans message="Next" />
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </MyOrderShell>
  );
}
