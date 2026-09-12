import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Alert} from '@shadcn/alert/alert';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {ProductCover} from '@ui/product-cover';
import {ArrowLeftIcon, CheckIcon, EyeIcon, VideoIcon} from 'lucide-react';
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
      const productResponse = await apiClient.get(
        `/api/v1/digital-products/${productId}`,
      );
      const product = (productResponse.data as {data: {course?: {id: number}}})
        .data;
      const courseId = product.course?.id;
      if (!courseId) throw new Error('Course not found');

      const preview = await apiClient.get(`/api/v1/courses/${courseId}/preview`);
      setCourse((preview.data as {data: CoursePreview}).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load course preview');
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <EyeIcon className="size-5" />
          <Trans message="Course Preview" />
        </DashboardLayout.SectionTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/dashboard/my-products/${productId}/course`)}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          <Trans message="Back to builder" />
        </Button>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="p-4 sm:p-6">
        {error ? (
          <Alert.Root variant="destructive" fillStyle="subtleFill">
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        ) : !course ? (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <main className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <Badge variant="outline" className="w-fit">
              <EyeIcon data-icon="inline-start" />
              <Trans message="Preview mode" />
            </Badge>
            <ProductCover
              cover={course.product.cover}
              alt={course.product.title}
              className="overflow-hidden rounded-card"
            />
            <section className="flex flex-col gap-3 rounded-card border bg-card p-4 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {course.product.title}
                </h1>
                <span className="text-lg font-semibold">
                  {formatMoney(course.product.price_cents, course.product.currency)}
                </span>
              </div>
              {course.product.description && (
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {course.product.description}
                </p>
              )}
              {course.product.learning_outcomes && course.product.learning_outcomes.length > 0 && (
                <section className="flex flex-col gap-2 mt-4">
                  <h3 className="text-sm font-semibold">
                    <Trans message="What you'll learn" />
                  </h3>
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
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">
                <Trans message="Course curriculum" />
              </h2>
              {course.chapters.map((chapter, chapterIndex) => (
                <div key={chapter.id} className="rounded-card border bg-card">
                  <div className="border-b px-4 py-3 text-sm font-medium">
                    {chapterIndex + 1}. {chapter.title}
                  </div>
                  <div className="flex flex-col">
                    {chapter.lessons.map((lesson, lessonIndex) => (
                      <div
                        key={lesson.id}
                        className="flex items-center gap-3 px-4 py-3 text-sm not-last:border-b"
                      >
                        <VideoIcon className="size-4 text-muted-foreground" />
                        <span className="flex-1 truncate">
                          {lessonIndex + 1}. {lesson.title}
                        </span>
                        <Badge variant={lesson.status === 'published' ? 'positive' : 'outline'}>
                          <Trans message={lesson.status === 'published' ? 'Published' : 'Draft'} />
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          </main>
        )}
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
