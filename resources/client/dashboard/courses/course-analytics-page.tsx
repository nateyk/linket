import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Accordion} from '@shadcn/accordion/accordion';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Empty} from '@shadcn/empty/empty';
import {Progress} from '@shadcn/progress/progress';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {
  BarChart3Icon,
  BookOpenIcon,
  CheckCircleIcon,
  LayersIcon,
  PencilIcon,
  UsersIcon,
} from 'lucide-react';
import {ReactNode, useCallback, useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router';

type AnalyticsLesson = {
  id: number;
  title: string;
  completedLearners: number;
  completionRate: number;
  dropOffRate: number;
};

type AnalyticsChapter = {
  id: number;
  title: string;
  lessonsCount: number;
  completedLearners: number;
  completionRate: number;
  lessons: AnalyticsLesson[];
};

type CourseAnalytics = {
  activeLearners: number;
  totalLessons: number;
  totalChapters: number;
  lessonCompletions: number;
  avgLessonCompletion: number;
  avgChapterCompletion: number;
  chapters: AnalyticsChapter[];
};

export function CourseAnalyticsPage() {
  const {productId} = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!productId) {
      setError('Missing product');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const productRes = await apiClient.get(`/api/v1/digital-products/${productId}`);
      const productData = (productRes.data as {data: {course?: {id: number}; course_id?: number}}).data;
      const courseId = productData.course?.id ?? productData.course_id;
      if (!courseId) {
        throw new Error('Course not found — this product is not a course');
      }
      const res = await apiClient.get(`/api/v1/courses/${courseId}/analytics`);
      const data = (res.data as {data: CourseAnalytics}).data;
      setAnalytics(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load analytics';
      setError(message);
      toast.danger(message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle>
            <BarChart3Icon className="size-5" />
            <Trans message="Course Analytics" />
          </DashboardLayout.SectionTitle>
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl space-y-5 py-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
            </div>
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  if (error) {
    return (
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle>
            <BarChart3Icon className="size-5" />
            <Trans message="Course Analytics" />
          </DashboardLayout.SectionTitle>
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl py-6">
            <Alert.Root variant="destructive" fillStyle="subtleFill">
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle>
            <BarChart3Icon className="size-5" />
            <Trans message="Course Analytics" />
          </DashboardLayout.SectionTitle>
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl py-6">
            <Empty.Root className="rounded-xl border border-dashed py-16">
              <Empty.Header>
                <Empty.Media variant="icon">
                  <BarChart3Icon />
                </Empty.Media>
                <Empty.Title>
                  <Trans message="No analytics yet" />
                </Empty.Title>
                <Empty.Description>
                  <Trans message="Once learners enroll, analytics will appear here." />
                </Empty.Description>
              </Empty.Header>
            </Empty.Root>
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <BarChart3Icon className="size-5" />
          <Trans message="Course Analytics" />
        </DashboardLayout.SectionTitle>
        <Button variant="outline" size="sm" data-icon onClick={() => navigate(`/dashboard/my-products/${productId}/course`)}>
          <PencilIcon className="size-4" />
          <Trans message="Back to builder" />
        </Button>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl space-y-5 py-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard label="Active learners" value={String(analytics.activeLearners)} hint="Enrolled" icon={<UsersIcon />} tone="default" compact />
          <MetricCard label="Avg. completion" value={`${analytics.avgLessonCompletion.toFixed(0)}%`} hint={`${analytics.totalLessons} lessons`} icon={<BookOpenIcon />} tone={analytics.avgLessonCompletion >= 50 ? 'positive' : 'warning'} compact />
          <MetricCard label="Completions" value={String(analytics.lessonCompletions)} hint="Total" icon={<CheckCircleIcon />} tone="positive" compact />
          <MetricCard label="Avg. chapter" value={`${analytics.avgChapterCompletion.toFixed(0)}%`} hint={`${analytics.totalChapters} chapters`} icon={<LayersIcon />} tone={analytics.avgChapterCompletion >= 50 ? 'positive' : 'default'} compact />
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b bg-muted/20 px-5 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3Icon className="size-4 text-muted-foreground" />
              <Trans message="Detailed performance" />
            </h2>
            <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border">
              {analytics.chapters.length} chapters · {analytics.totalLessons} lessons
            </span>
          </div>
          {analytics.chapters.length === 0 ? (
            <Empty.Root className="border-0 py-12">
              <Empty.Header>
                <Empty.Media variant="icon">
                  <BookOpenIcon />
                </Empty.Media>
                <Empty.Title>
                  <Trans message="No chapters yet" />
                </Empty.Title>
                <Empty.Description>
                  <Trans message="Add chapters and lessons to see detailed analytics." />
                </Empty.Description>
              </Empty.Header>
            </Empty.Root>
          ) : (
            <Accordion.Root className="w-full divide-y">
              {analytics.chapters.map(ch => (
                <Accordion.Item key={ch.id} value={String(ch.id)} className="border-0">
                  <Accordion.Trigger className="gap-3 px-5 py-3 hover:bg-muted/40 hover:no-underline data-[state=open]:bg-muted/30">
                    <div className="flex flex-1 items-center gap-3 text-left">
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/10">
                        <BookOpenIcon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-none">{ch.title}</p>
                        <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">{ch.lessonsCount} lessons</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">{ch.completedLearners} learners</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${ch.completionRate >= 50 ? 'bg-positive/10 text-positive' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>{ch.completionRate.toFixed(0)}%</span>
                        </p>
                      </div>
                    </div>
                  </Accordion.Trigger>
                  <Accordion.Content className="px-0 pb-0">
                    <div className="overflow-x-auto border-y bg-card">
                      <Table.Root>
                        <Table.Header>
                          <Table.Row className="border-b bg-muted/20 hover:bg-muted/20">
                            <Table.Head className="h-8 px-5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              <Trans message="Lesson" />
                            </Table.Head>
                            <Table.Head className="h-8 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground tabular-nums">
                              <Trans message="Done" />
                            </Table.Head>
                            <Table.Head className="h-8 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              <Trans message="Completion" />
                            </Table.Head>
                            <Table.Head className="h-8 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                              <Trans message="Drop-off" />
                            </Table.Head>
                            <Table.Head className="h-8 w-16 px-5" />
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {ch.lessons.map(l => (
                            <Table.Row key={l.id} className="h-12 border-b last:border-0 hover:bg-muted/20">
                              <Table.Cell className="max-w-[220px] truncate px-5 py-2 text-sm font-medium" title={l.title}>
                                {l.title}
                              </Table.Cell>
                              <Table.Cell className="px-3 py-2 text-sm tabular-nums">{l.completedLearners}</Table.Cell>
                              <Table.Cell className="px-3 py-2">
                                <div className="flex w-28 items-center gap-2">
                                  <Progress.Root value={l.completionRate} className="flex-1">
                                    <Progress.Track className="h-1.5 bg-muted">
                                      <Progress.Indicator className="bg-positive" />
                                    </Progress.Track>
                                  </Progress.Root>
                                  <span className="w-8 text-right text-xs font-medium tabular-nums">{l.completionRate.toFixed(0)}%</span>
                                </div>
                              </Table.Cell>
                              <Table.Cell className="px-3 py-2">
                                <div className="flex w-28 items-center gap-2">
                                  <Progress.Root value={l.dropOffRate} className="flex-1">
                                    <Progress.Track className="h-1.5 bg-muted">
                                      <Progress.Indicator className="bg-amber-500" />
                                    </Progress.Track>
                                  </Progress.Root>
                                  <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{l.dropOffRate.toFixed(0)}%</span>
                                </div>
                              </Table.Cell>
                              <Table.Cell className="px-5 py-2">
                                <Button variant="ghost" size="icon-sm" className="size-7" onClick={() => navigate(`/dashboard/my-products/${productId}/course?lessonId=${l.id}`)} aria-label="Edit lesson">
                                  <PencilIcon className="size-3.5" />
                                </Button>
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    </div>
                  </Accordion.Content>
                </Accordion.Item>
              ))}
            </Accordion.Root>
          )}
        </div>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  compact = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: 'default' | 'positive' | 'warning';
  compact?: boolean;
}) {
  const iconClass =
    tone === 'positive'
      ? 'text-positive bg-positive/10'
      : tone === 'warning'
        ? 'text-amber-600 bg-amber-500/10 dark:text-amber-400'
        : 'text-muted-foreground bg-muted';
  return (
    <Card size="sm" className={compact ? "gap-2 py-3" : "gap-3"}>
      <Card.Header className={compact ? "pb-0" : undefined}>
        <Card.Title className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Trans message={label} />
        </Card.Title>
        <Card.Action>
          <span className={`flex items-center justify-center rounded-card-sm [&>svg]:size-3.5 ${iconClass} ${compact ? "size-7" : "size-9 [&>svg]:size-4"}`}>
            {icon}
          </span>
        </Card.Action>
      </Card.Header>
      <Card.Content className={compact ? "pt-0" : undefined}>
        <p className={`truncate font-semibold tracking-tight tabular-nums ${compact ? "text-xl" : "text-2xl"}`}>{value}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
      </Card.Content>
    </Card>
  );
}
