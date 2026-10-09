import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Alert} from '@shadcn/alert/alert';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {ProductCover} from '@ui/product-cover';
import {ArrowLeftIcon, CheckIcon, EyeIcon, GraduationCapIcon} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router';

type CoursePreview = {
  id: number;
  product: {
    id: number;
    title: string;
    description?: string | null;
    learning_outcomes?: string[] | null;
    price_cents: number;
    currency: string;
    cover?: {id: number; url: string} | null;
  };
  chapters: Array<{
    id: number;
    title: string;
    lessons: Array<{id: number; title: string; status: 'draft' | 'published'}>;
  }>;
};

function ChapterSkeleton() {
  return (
    <div className="rounded-card border bg-card">
      <Skeleton className="border-b px-4 py-3 h-5 w-1/3" />
      <div className="flex flex-col gap-2 px-4 py-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-3/4" />
      </div>
    </div>
  );
}

export function Component() {
  const {productId} = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CoursePreview | null>(null);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!productId) {
      setError('Course product not found');
      return;
    }

    try {
      const productResponse = await apiClient.get(`/api/v1/items/${productId}`);
      const product = (productResponse.data as {data: {course?: {id: number}}}).data;
      const courseId = product.course?.id;
      if (!courseId) throw new Error('Course not found');

      const preview = await apiClient.get(`/api/v1/courses/${courseId}/preview`);
      setCourse((preview.data as {data: CoursePreview}).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load course preview');
    }
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <EyeIcon className="size-5" /><Trans message="Course Preview" />
        </DashboardLayout.SectionTitle>
        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/items/${productId}/course`)}>
          <ArrowLeftIcon data-icon="inline-start" /><Trans message="Back to builder" />
        </Button>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="p-4 sm:p-6">
        {error ? (
          <Alert.Root variant="destructive" fillStyle="subtleFill">
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        ) : !course ? (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <Skeleton className="aspect-video w-full rounded-card" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <div className="flex flex-col gap-3">
              <ChapterSkeleton />
              <ChapterSkeleton />
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Badge variant="outline" className="w-fit sm:w-auto">
                <EyeIcon data-icon="inline-start" /><Trans message="Preview mode" />
              </Badge>
              <span className="text-lg font-semibold text-primary sm:ml-auto">
                {formatMoney(course.product.price_cents, course.product.currency)}
              </span>
            </div>

            <ProductCover cover={course.product.cover} alt={course.product.title} className="overflow-hidden rounded-card aspect-video w-full" />

            <section className="mt-6 flex flex-col gap-4 rounded-card border bg-card p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-card-sm bg-primary/10 text-primary">
                    <GraduationCapIcon className="size-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h1 className="truncate text-2xl font-semibold tracking-tight">{course.product.title}</h1>
                    <p className="text-sm text-muted-foreground">
                      <Trans message=":lessons lessons in :chapters chapters" values={{lessons: course.chapters.reduce((a, c) => a + c.lessons.length, 0), chapters: course.chapters.length}} />
                    </p>
                  </div>
                </div>
              </div>
              {course.product.description && (
                <p className="whitespace-pre-wrap text-muted-foreground mt-2">{course.product.description}</p>
              )}
              {course.product.learning_outcomes && course.product.learning_outcomes.length > 0 && (
                <section className="flex flex-col gap-2 mt-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold"><Trans message="What you'll learn" /></h3>
                  <ul className="flex flex-col gap-2">
                    {course.product.learning_outcomes.map((outcome, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckIcon className="size-4 shrink-0 text-positive" />
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </section>

            <section className="mt-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold"><Trans message="Course curriculum" /></h2>
                <Badge variant="secondary" className="text-xs">
                  <Trans message=":count total lessons" values={{count: course.chapters.reduce((a, c) => a + c.lessons.length, 0)}} />
                </Badge>
              </div>
              {course.chapters.length === 0 ? (
                <div className="rounded-card border bg-card p-8 text-center">
                  <GraduationCapIcon className="mx-auto size-12 text-muted-foreground" aria-hidden="true" />
                  <h3 className="mt-3 text-sm font-medium"><Trans message="No chapters yet" /></h3>
                  <p className="mt-1 text-sm text-muted-foreground"><Trans message="Add chapters and lessons in the course builder." /></p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {course.chapters.map((chapter, chapterIndex) => (
                    <div key={chapter.id} className="rounded-card border bg-card overflow-hidden">
                      <div className="bg-muted/30 border-b px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{chapterIndex + 1}</span>
                          <h3 className="text-sm font-medium">{chapter.title}</h3>
                          <span className="ml-auto text-xs text-muted-foreground">
                            <Trans message=":count lessons" values={{count: chapter.lessons.length}} />
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col divide-y">
                        {chapter.lessons.map((lesson, lessonIndex) => (
                          <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-mono">
                              {lessonIndex + 1}
                            </span>
                            <span className="flex-1 truncate font-medium">{lesson.title}</span>
                            <Badge variant={lesson.status === 'published' ? 'positive' : 'outline'} className="text-xs">
                              <Trans message={lesson.status === 'published' ? 'Published' : 'Draft'} />
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-8 flex items-center justify-between gap-3 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                <Trans message="This is a preview. Learners will see this layout when enrolled." />
              </p>
              <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/items/${productId}/course`)}>
                <ArrowLeftIcon data-icon="inline-start" /><Trans message="Back to builder" />
              </Button>
            </div>
          </div>
        )}
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}