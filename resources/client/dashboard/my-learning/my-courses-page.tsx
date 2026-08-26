import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Card} from '@shadcn/card/card';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {Progress} from '@shadcn/progress/progress';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Trans} from '@ui/i18n/trans';
import {GraduationCapIcon, PlayIcon, SparklesIcon} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link} from 'react-router';

type EnrolledCourse = {
  course_id: number;
  product_id: number;
  title: string;
  cover?: {url: string} | null;
  total_lessons: number;
  percent: number;
  completed: number;
  next_lesson_id?: number | null;
};

export function Component() {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/v1/my-courses', {
          credentials: 'same-origin',
          headers: {Accept: 'application/json'},
        });
        if (res.ok) {
          const payload = await res.json();
          setCourses(payload.data ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <GraduationCapIcon />
          <Trans message="My Courses" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl space-y-6 py-6">
          <PromotionBlock />
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-44 w-full" />
              ))}
            </div>
          ) : courses.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {courses.map(c => (
                <Card.Root key={c.course_id} className="gap-0 overflow-hidden py-0">
                  <div className="aspect-video bg-muted">
                    {c.cover?.url ? (
                      <img src={c.cover.url} alt={c.title} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <GraduationCapIcon className="size-8" />
                      </div>
                    )}
                  </div>
                  <Card.Content className="flex flex-col gap-3 p-4">
                    <Card.Title className="text-base">{c.title}</Card.Title>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        <Trans message=":completed of :total lessons" values={{completed: c.completed, total: c.total_lessons}} />
                      </span>
                      <span>•</span>
                      <span>{c.percent}%</span>
                    </div>
                    <Progress.Root value={c.percent} className="h-1.5">
                      <Progress.Track>
                        <Progress.Indicator />
                      </Progress.Track>
                    </Progress.Root>
                    <div className="flex gap-2">
                      {c.percent >= 100 ? (
                        <Badge variant="positive">
                          <Trans message="Completed" />
                        </Badge>
                      ) : c.next_lesson_id ? (
                        <Button size="sm" render={<Link to={`/dashboard/learn/${c.course_id}/lessons/${c.next_lesson_id}`} />}>
                          <PlayIcon />
                          <Trans message="Continue course" />
                        </Button>
                      ) : (
                        <Button size="sm" render={<Link to={`/dashboard/learn/${c.course_id}`} />}>
                          <Trans message="View course" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" render={<Link to={`/dashboard/learn/${c.course_id}`} />}>
                        <Trans message="Open" />
                      </Button>
                    </div>
                  </Card.Content>
                </Card.Root>
              ))}
            </div>
          ) : (
            <Empty.Root className="rounded-card border border-dashed py-16">
              <Empty.Header>
                <Empty.Media variant="icon">
                  <GraduationCapIcon />
                </Empty.Media>
                <Empty.Title>
                  <Trans message="No courses yet" />
                </Empty.Title>
                <Empty.Description>
                  <Trans message="Courses you purchase will appear here." />
                </Empty.Description>
              </Empty.Header>
            </Empty.Root>
          )}
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function PromotionBlock() {
  return (
    <Card.Root className="border-primary/20 bg-primary/5 py-0">
      <Card.Content className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <SparklesIcon className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold"><Trans message="Promotion — featured learning" /></p>
            <p className="text-xs text-muted-foreground"><Trans message="Discover curated courses from top creators. Your next skill is one click away." /></p>
          </div>
        </div>
        <Button size="sm" variant="outline" render={<Link to="/my-order" />}><Trans message="View my orders" /></Button>
      </Card.Content>
    </Card.Root>
  );
}
