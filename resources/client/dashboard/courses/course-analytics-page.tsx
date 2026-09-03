import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {StatCard} from '@common/ui/stat-card';
import {Accordion} from '@shadcn/accordion/accordion';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {Progress} from '@shadcn/progress/progress';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {cn} from '@ui/utils/cn';
import {
  BarChart3Icon,
  BookOpenIcon,
  CheckCircleIcon,
  LayersIcon,
  PencilIcon,
  UsersIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
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
        <DashboardLayout.SectionContent className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full" />
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
        <DashboardLayout.SectionContent className="p-6">
          <Alert.Root variant="destructive" fillStyle="subtleFill">
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
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
        <DashboardLayout.SectionContent className="p-6">
          <Empty.Root>
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
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  const overviewCardClassName = cn(
    'rounded-xl border bg-card text-card-foreground shadow-xs',
  );

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

      <DashboardLayout.SectionContent className="gap-6 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            className={overviewCardClassName}
            icon={<UsersIcon className="size-4" data-icon="inline-start" />}
            label={<Trans message="Active learners" />}
            value={analytics.activeLearners}
            hint={<Trans message="Enrolled learners" />}
          />
          <StatCard
            className={overviewCardClassName}
            icon={<BookOpenIcon className="size-4" data-icon="inline-start" />}
            label={<Trans message="Avg. lesson completion" />}
            value={`${analytics.avgLessonCompletion.toFixed(1)}%`}
            hint={`${analytics.totalLessons} lessons`}
          />
          <StatCard
            className={overviewCardClassName}
            icon={<CheckCircleIcon className="size-4" data-icon="inline-start" />}
            label={<Trans message="Lesson completions" />}
            value={analytics.lessonCompletions}
            hint={<Trans message="Total completions" />}
          />
          <StatCard
            className={overviewCardClassName}
            icon={<LayersIcon className="size-4" data-icon="inline-start" />}
            label={<Trans message="Avg. chapter completion" />}
            value={`${analytics.avgChapterCompletion.toFixed(1)}%`}
            hint={`${analytics.totalChapters} chapters`}
          />
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">
            <Trans message="Detailed performance" />
          </h2>

          {analytics.chapters.length === 0 ? (
            <Empty.Root>
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
            <Accordion.Root className="w-full rounded-xl border bg-card">
              {analytics.chapters.map(ch => (
                <Accordion.Item key={ch.id} value={String(ch.id)}>
                  <Accordion.Trigger className="gap-4 px-4">
                    <div className="flex flex-1 flex-col gap-1 text-left">
                      <span className="text-sm font-medium">Chapter {ch.title}</span>
                      <span className="text-xs text-muted-foreground">
                        Lessons: {ch.lessonsCount} · Completed learners: {ch.completedLearners} · Completion rate: {ch.completionRate.toFixed(1)}%
                      </span>
                    </div>
                  </Accordion.Trigger>
                  <Accordion.Content className="px-0 pb-0">
                    <div className="overflow-x-auto">
                      <Table.Root>
                        <Table.Header>
                          <Table.Row>
                            <Table.Head>
                              <Trans message="Lesson" />
                            </Table.Head>
                            <Table.Head className="tabular-nums">
                              <Trans message="Completed learners" />
                            </Table.Head>
                            <Table.Head>
                              <Trans message="Completion rate" />
                            </Table.Head>
                            <Table.Head>
                              <Trans message="Drop-off rate" />
                            </Table.Head>
                            <Table.Head />
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {ch.lessons.map(l => (
                            <Table.Row key={l.id}>
                              <Table.Cell className="font-medium">{l.title}</Table.Cell>
                              <Table.Cell className="tabular-nums">{l.completedLearners}</Table.Cell>
                              <Table.Cell>
                                <div className="flex min-w-32 flex-col gap-1.5">
                                  <span className="text-xs tabular-nums">{l.completionRate.toFixed(1)}%</span>
                                  <Progress.Root value={l.completionRate} className="w-full">
                                    <Progress.Track className="h-1.5">
                                      <Progress.Indicator />
                                    </Progress.Track>
                                  </Progress.Root>
                                </div>
                              </Table.Cell>
                              <Table.Cell>
                                <div className="flex min-w-32 flex-col gap-1.5">
                                  <span className="text-xs tabular-nums">{l.dropOffRate.toFixed(1)}%</span>
                                  <Progress.Root value={l.dropOffRate} className="w-full">
                                    <Progress.Track className="h-2">
                                      <Progress.Indicator />
                                    </Progress.Track>
                                  </Progress.Root>
                                </div>
                              </Table.Cell>
                              <Table.Cell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  data-icon
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
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
