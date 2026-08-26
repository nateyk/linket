import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Accordion} from '@shadcn/accordion/accordion';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Progress} from '@shadcn/progress/progress';
import {Trans} from '@ui/i18n/trans';
import {CheckCircle2Icon, LockIcon, PlayIcon} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link, useParams} from 'react-router';

type CourseData = {
  id: number;
  product: {title: string; cover?: {url: string} | null};
  chapters: {id: number; title: string; lessons: {id: number; title: string; status: string}[]}[];
  progress: {total: number; completed: number; percent: number; completed_lesson_ids: number[]};
};

export function Component() {
  const {courseId} = useParams();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/v1/courses/${courseId}/learn`, {
        credentials: 'same-origin',
        headers: {Accept: 'application/json'},
      });
      if (res.ok) {
        const payload = await res.json();
        setCourse(payload.data);
      }
      setLoading(false);
    })();
  }, [courseId]);

  if (loading) return <DashboardLayout.MainSection><DashboardLayout.SectionContent className="p-6">Loading...</DashboardLayout.SectionContent></DashboardLayout.MainSection>;
  if (!course) return <DashboardLayout.MainSection><DashboardLayout.SectionContent className="p-6">Course not found or not enrolled.</DashboardLayout.SectionContent></DashboardLayout.MainSection>;

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message={course.product.title} />
        </DashboardLayout.SectionTitle>
        <Button size="sm" variant="outline" render={<Link to={`/dashboard/my-courses`} />}>
          <Trans message="My courses" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-6 py-6">
          {course.product.cover?.url && (
            <div className="overflow-hidden rounded-card">
              <img src={course.product.cover.url} alt={course.product.title} className="aspect-video w-full object-cover" />
            </div>
          )}
          <h1 className="text-2xl font-semibold">{course.product.title}</h1>

          <Card.Root className="gap-0 py-0">
            <Card.Content className="p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>
                  <Trans message="Completed :completed of :total lessons" values={{completed: course.progress.completed, total: course.progress.total}} />
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

          <div className="space-y-3">
            <h3 className="font-semibold">
              <Trans message="Course content" />
            </h3>
            <p className="text-sm text-muted-foreground">
              {course.chapters.length} chapters • {course.progress.total} lessons
            </p>
            <Accordion.Root type="multiple" className="space-y-3">
              {course.chapters.map(chapter => (
                <Accordion.Item key={chapter.id} value={String(chapter.id)} className="rounded-card border bg-card">
                  <Accordion.Trigger className="px-4">
                    <span className="font-medium">{chapter.title}</span>
                    <span className="text-xs text-muted-foreground">{chapter.lessons.length} lessons</span>
                  </Accordion.Trigger>
                  <Accordion.Content className="space-y-1 px-2 pb-2">
                    {chapter.lessons.map(lesson => {
                      const completed = course.progress.completed_lesson_ids.includes(lesson.id);
                      const isPublished = lesson.status === 'published';
                      return (
                        <Link
                          key={lesson.id}
                          to={isPublished ? `/dashboard/learn/${course.id}/lessons/${lesson.id}` : '#'}
                          className={`flex items-center gap-2 rounded-card border p-3 text-sm ${completed ? 'bg-positive/5' : 'bg-background hover:bg-muted/30'} ${!isPublished ? 'opacity-60 pointer-events-none' : ''}`}
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
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
