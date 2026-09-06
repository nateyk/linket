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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active learners" value={String(analytics.activeLearners)} hint="Enrolled learners" icon={<UsersIcon />} tone="default" />
          <MetricCard label="Avg. lesson completion" value={`${analytics.avgLessonCompletion.toFixed(1)}%`} hint={`${analytics.totalLessons} lessons`} icon={<BookOpenIcon />} tone="positive" />
          <MetricCard label="Lesson completions" value={String(analytics.lessonCompletions)} hint="Total completions" icon={<CheckCircleIcon />} tone="positive" />
          <MetricCard label="Avg. chapter completion" value={`${analytics.avgChapterCompletion.toFixed(1)}%`} hint={`${analytics.totalChapters} chapters`} icon={<LayersIcon />} tone={analytics.avgChapterCompletion >= 50 ? 'positive' : 'default'} />
        </div>

        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-4">
            <h2 className="text-sm font-semibold">
              <Trans message="Detailed performance" />
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              <Trans message="Completion and drop-off by chapter and lesson" />
            </p>
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
            <Accordion.Root className="w-full">
              {analytics.chapters.map(ch => (
                <Accordion.Item key={ch.id} value={String(ch.id)} className="border-b last:border-0">
                  <Accordion.Trigger className="gap-4 px-6 py-4 hover:bg-muted/30 hover:no-underline">
                    <div className="flex flex-1 items-center gap-3 text-left">
                      <span className="flex size-8 items-center justify-center rounded-card-sm bg-muted text-muted-foreground">
                        <BookOpenIcon className="size-4" />
                      </span>
                      <div className="flex flex-1 flex-col gap-1">
                        <span className="text-sm font-medium">{ch.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {ch.lessonsCount} lessons · {ch.completedLearners} learners · {ch.completionRate.toFixed(1)}% avg
                        </span>
                      </div>
                    </div>
                  </Accordion.Trigger>
                  <Accordion.Content className="px-0 pb-0">
                    <div className="overflow-x-auto border-t bg-muted/10">
                      <Table.Root>
                        <Table.Header>
                          <Table.Row className="bg-muted/30">
                            <Table.Head className="px-6">
                              <Trans message="Lesson" />
                            </Table.Head>
                            <Table.Head className="tabular-nums">
                              <Trans message="Completed" />
                            </Table.Head>
                            <Table.Head>
                              <Trans message="Completion" />
                            </Table.Head>
                            <Table.Head>
                              <Trans message="Drop-off" />
                            </Table.Head>
                            <Table.Head />
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {ch.lessons.map(l => (
                            <Table.Row key={l.id} className="hover:bg-muted/30">
                              <Table.Cell className="max-w-[240px] truncate px-6 font-medium" title={l.title}>
                                {l.title}
                              </Table.Cell>
                              <Table.Cell className="tabular-nums">{l.completedLearners}</Table.Cell>
                              <Table.Cell>
                                <div className="flex min-w-32 flex-col gap-1.5">
                                  <span className="text-xs font-medium tabular-nums">{l.completionRate.toFixed(1)}%</span>
                                  <Progress.Root value={l.completionRate} className="w-full">
                                    <Progress.Track className="h-1.5 bg-muted">
                                      <Progress.Indicator className="bg-positive" />
                                    </Progress.Track>
                                  </Progress.Root>
                                </div>
                              </Table.Cell>
                              <Table.Cell>
                                <div className="flex min-w-32 flex-col gap-1.5">
                                  <span className="text-xs font-medium tabular-nums">{l.dropOffRate.toFixed(1)}%</span>
                                  <Progress.Root value={l.dropOffRate} className="w-full">
                                    <Progress.Track className="h-1.5 bg-muted">
                                      <Progress.Indicator className="bg-amber-500" />
                                    </Progress.Track>
                                  </Progress.Root>
                                </div>
                              </Table.Cell>
                              <Table.Cell className="px-6">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/dashboard/my-products/${productId}/course?lessonId=${l.id}`)}
                                >
                                  <PencilIcon className="size-4" />
                                  <Trans message="Edit" />
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
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: 'default' | 'positive' | 'warning';
}) {
  const iconClass =
    tone === 'positive'
      ? 'text-positive bg-positive/10'
      : tone === 'warning'
        ? 'text-amber-600 bg-amber-500/10 dark:text-amber-400'
        : 'text-muted-foreground bg-muted';
  return (
    <Card size="sm" className="gap-3">
      <Card.Header>
        <Card.Title className="truncate text-sm font-normal text-muted-foreground">
          <Trans message={label} />
        </Card.Title>
        <Card.Action>
          <span className={`flex size-9 items-center justify-center rounded-card-sm [&>svg]:size-4 ${iconClass}`}>
            {icon}
          </span>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <p className="truncate text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
      </Card.Content>
    </Card>
  );
}
