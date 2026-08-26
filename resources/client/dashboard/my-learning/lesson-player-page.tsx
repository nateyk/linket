import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Trans} from '@ui/i18n/trans';
import {apiClient} from '@common/http/query-client';
import {CheckIcon, ChevronLeftIcon, ChevronRightIcon, DownloadIcon, LockIcon} from 'lucide-react';
import {useEffect, useState} from 'react';
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
  resources: {id: number; display_name: string; file: {id: number; name: string}}[];
};

export function Component() {
  const {courseId, lessonId} = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [trial, setTrial] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/v1/courses/${courseId}/learn/lessons/${lessonId}`, {
      credentials: 'same-origin',
      headers: {Accept: 'application/json'},
    });
    if (!res.ok) {
      if (res.status === 403) {
        // locked
        setTrial(true);
        return;
      }
      throw new Error('Unable to load lesson');
    }
    const payload = await res.json();
    setLesson(payload.data);
    // Also load course for navigation
    const cRes = await fetch(`/api/v1/courses/${courseId}/learn`, {
      credentials: 'same-origin',
      headers: {Accept: 'application/json'},
    });
    if (cRes.ok) {
      const cPayload = await cRes.json();
      setCourse(cPayload.data);
    }
  };

  useEffect(() => {
    void load();
  }, [courseId, lessonId]);

  const complete = async () => {
    await apiClient.post(`/api/v1/course-lessons/${lessonId}/complete`);
    // Find next lesson
    if (course) {
      const flat = course.chapters.flatMap((ch: any) => ch.lessons);
      const idx = flat.findIndex((l: any) => l.id === Number(lessonId));
      const next = flat[idx + 1];
      if (next) navigate(`/dashboard/learn/${courseId}/lessons/${next.id}`);
      else await load();
    }
  };

  if (trial) {
    return (
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionContent className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <LockIcon className="size-8 text-muted-foreground" />
          <p className="text-sm">
            <Trans message="This lesson is locked. Complete previous lessons to unlock." />
          </p>
          <Button render={<Link to={`/dashboard/learn/${courseId}`} />}>
            <Trans message="Back to course" />
          </Button>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  if (!lesson) return <DashboardLayout.MainSection><DashboardLayout.SectionContent className="p-6">Loading lesson...</DashboardLayout.SectionContent></DashboardLayout.MainSection>;

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message={lesson.title} />
        </DashboardLayout.SectionTitle>
        <Button variant="outline" size="sm" render={<Link to={`/dashboard/learn/${courseId}`} />}>
          <Trans message="Course" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 py-6">
          {lesson.video_url && (
            <div className="aspect-video overflow-hidden rounded-card border bg-muted">
              <iframe src={lesson.video_url} className="size-full" allowFullScreen title={lesson.title} />
            </div>
          )}
          {lesson.video?.url && !lesson.video_url && (
            <div className="aspect-video overflow-hidden rounded-card border bg-muted">
              <video src={lesson.video.url} controls className="size-full" />
            </div>
          )}
          {lesson.content && (
            <Card.Root>
              <Card.Content className="prose prose-sm max-w-none p-6" dangerouslySetInnerHTML={{__html: lesson.content}} />
            </Card.Root>
          )}
          {!!lesson.resources.length && (
            <Card.Root>
              <Card.Header className="p-4">
                <Card.Title className="text-sm">
                  <Trans message="Resources" />
                </Card.Title>
              </Card.Header>
              <Card.Content className="space-y-2 p-4 pt-0">
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
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (course) {
                  const flat = course.chapters.flatMap((ch: any) => ch.lessons);
                  const idx = flat.findIndex((l: any) => l.id === Number(lessonId));
                  const prev = flat[idx - 1];
                  if (prev) navigate(`/dashboard/learn/${courseId}/lessons/${prev.id}`);
                }
              }}
            >
              <ChevronLeftIcon />
              <Trans message="Previous" />
            </Button>
            <Button onClick={() => void complete()}>
              <CheckIcon />
              <Trans message="Complete & Next" />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (course) {
                  const flat = course.chapters.flatMap((ch: any) => ch.lessons);
                  const idx = flat.findIndex((l: any) => l.id === Number(lessonId));
                  const next = flat[idx + 1];
                  if (next) navigate(`/dashboard/learn/${courseId}/lessons/${next.id}`);
                }
              }}
            >
              <Trans message="Next" />
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
