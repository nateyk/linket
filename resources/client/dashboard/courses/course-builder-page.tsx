import {articleEditorTipTapExtensions} from '@common/article-editor/article-editor-tiptap-extensions';
import {apiClient} from '@common/http/query-client';
import {ClearFormatButton} from '@common/text-editor/menubar/clear-format-button';
import {Divider} from '@common/text-editor/menubar/divider';
import {FontStyleButtons} from '@common/text-editor/menubar/font-style-buttons';
import {FormatDropdown} from '@common/text-editor/menubar/format-dropdown';
import {LinkButton} from '@common/text-editor/menubar/link-button';
import {ListButtons} from '@common/text-editor/menubar/list-buttons';
import {TiptapEditorContent} from '@common/text-editor/tiptap-editor-content';
import {TipTapEditorProvider} from '@common/text-editor/tiptap-editor-provider';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {useActiveUpload} from '@common/uploads/uploader/use-active-upload';
import {Alert} from '@shadcn/alert/alert';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Drawer} from '@shadcn/drawer/drawer';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Select} from '@shadcn/forms/select/select';
import {
  ScrollArea,
  ScrollAreaScrollBar,
  ScrollAreaViewport,
} from '@shadcn/scroll-area/scroll-area';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Switch} from '@shadcn/forms/switch/switch';
import {FileDropzone} from '@common/ui/file-dropzone';
import {Trans} from '@ui/i18n/trans';
import {useSortable} from '@ui/interactions/dnd/sortable/use-sortable';
import {ProductCover} from '@ui/product-cover';
import {toast} from '@ui/toast/toast';
import {cn} from '@ui/utils/cn';
import {useMediaQuery} from '@ui/utils/hooks/use-media-query';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@shadcn/collapsible/collapsible';
import {
  ImageCrop,
  ImageCropApply,
  ImageCropContent,
  ImageCropReset,
} from '@shadcn/image-crop/image-crop';
import {
  ArrowLeftIcon,
  BarChart3Icon,
  ChevronDownIcon,
  CopyIcon,
  EyeIcon,
  GraduationCapIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
  VideoIcon,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {Link, useParams, useSearchParams} from 'react-router';

// Types
type Course = {
  id: number;
  digital_product_id: number;
  instructor_user_id: number;
  require_sequential_completion: boolean;
  published_at: string | null;
  product: {
    id: number;
    title: string;
    description?: string | null;
    price_cents: number;
    currency: string;
    status: string;
    cover?: {id: number; url: string} | null;
    biolink_ids?: number[];
  };
  chapters: Chapter[];
};

type Chapter = {
  id: number;
  course_id: number;
  title: string;
  sort_order: number;
  lessons: Lesson[];
};

type Lesson = {
  id: number;
  chapter_id: number;
  course_id: number;
  title: string;
  content?: string | null;
  video_type?: 'upload' | 'external' | null;
  video_url?: string | null;
  video_file_entry_id?: number | null;
  video?: {id: number; name: string; url: string} | null;
  status: 'draft' | 'published';
  sort_order: number;
  resources?: LessonResource[];
};

type LessonResource = {
  id: number;
  display_name: string;
  file: {id: number; name: string} | null;
};

type Biolink = {id: number; name: string; short_url?: string};

type PendingDelete =
  | {type: 'chapter'; item: Chapter}
  | {type: 'lesson'; item: Lesson};

export function Component() {
  return (
    <FileUploadProvider>
      <CourseBuilder />
    </FileUploadProvider>
  );
}

function CourseBuilder() {
  const {productId} = useParams();
  const [searchParams] = useSearchParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [mobileSurface, setMobileSurface] = useState<'curriculum' | 'editor'>(
    'curriculum',
  );
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reordering, setReordering] = useState<string>();
  const [moveRequest, setMoveRequest] = useState<{
    lesson: Lesson;
    sourceChapter: Chapter;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const productRes = await apiClient.get(
        `/api/v1/digital-products/${productId}`,
      );
      const productData = productRes.data.data;
      const courseId = productData.course?.id;
      if (!courseId)
        throw new Error('Course not found — this product is not a course');
      const res = await apiClient.get(`/api/v1/courses/${courseId}`);
      const payload = res.data.data as Course;
      setCourse(payload);
      const lessonId = Number(searchParams.get('lessonId'));
      const requestedChapter = Number.isInteger(lessonId)
        ? payload.chapters.find(chapter =>
            chapter.lessons.some(lesson => lesson.id === lessonId),
          )
        : undefined;
      const requestedLesson = requestedChapter?.lessons.find(
        lesson => lesson.id === lessonId,
      );
      const firstChapter = payload.chapters[0];
      const selectedLesson = requestedLesson ?? firstChapter?.lessons[0];
      if (selectedLesson) {
        setSelectedLesson(selectedLesson);
        setSelectedChapterId(requestedChapter?.id ?? firstChapter.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [productId, searchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const addChapter = async () => {
    if (!course) return;
    const existingNums = course.chapters
      .map(c => {
        const m = c.title.match(/^Chapter\s+(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => n > 0);
    const maxNum = existingNums.length ? Math.max(...existingNums) : 0;
    const nextNum = Math.max(maxNum + 1, course.chapters.length + 1);
    const title = `Chapter ${nextNum}`;
    try {
      const res = await apiClient.post(`/api/v1/courses/${course.id}/chapters`, {title});
      const newChapter = (res.data as any).data as Chapter;
      setCourse(c => c ? {...c, chapters: [...c.chapters, {...newChapter, lessons: newChapter.lessons ?? []}]} : c);
      toast.positive('Chapter added');
    } catch (e: any) {
      toast.danger(e.message ?? 'Unable to add chapter');
    }
  };

  const addLesson = async (chapterId: number) => {
    const chapter = course?.chapters.find(c => c.id === chapterId);
    const existingNums = (chapter?.lessons ?? [])
      .map(l => {
        const m = l.title.match(/^Lesson\s+(\d+)$/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => n > 0);
    const maxNum = existingNums.length ? Math.max(...existingNums) : 0;
    const nextNum = Math.max(maxNum + 1, (chapter?.lessons.length ?? 0) + 1);
    try {
      const res = await apiClient.post(
        `/api/v1/course-chapters/${chapterId}/lessons`,
        {
          title: `Lesson ${nextNum}`,
        },
      );
      const lesson = (res.data as any).data as Lesson;
      setCourse(c => {
        if (!c) return c;
        return {
          ...c,
          chapters: c.chapters.map(ch =>
            ch.id === chapterId ? {...ch, lessons: [...ch.lessons, lesson]} : ch,
          ),
        };
      });
      setSelectedLesson(lesson);
      setSelectedChapterId(chapterId);
      setMobileSurface('editor');
    } catch (e: any) {
      toast.danger(e.message ?? 'Unable to add lesson');
    }
  };

  const updateChapterTitle = async (chapterId: number, title: string) => {
    await apiClient.put(`/api/v1/course-chapters/${chapterId}`, {title});
    setCourse(c => {
      if (!c) return c;
      return {
        ...c,
        chapters: c.chapters.map(ch =>
          ch.id === chapterId ? {...ch, title} : ch,
        ),
      };
    });
  };

  const deleteChapter = (chapter: Chapter) => {
    setPendingDelete({type: 'chapter', item: chapter});
  };

  const deleteLesson = (lesson: Lesson) => {
    setPendingDelete({type: 'lesson', item: lesson});
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;

    setDeleting(true);
    const toDelete = pendingDelete;
    const prevCourse = course;
    try {
      const endpoint =
        toDelete.type === 'chapter'
          ? `/api/v1/course-chapters/${toDelete.item.id}`
          : `/api/v1/course-lessons/${toDelete.item.id}`;
      await apiClient.delete(endpoint);
      setCourse(c => {
        if (!c) return c;
        if (toDelete.type === 'chapter') {
          return {...c, chapters: c.chapters.filter(ch => ch.id !== toDelete.item.id)};
        }
        return {
          ...c,
          chapters: c.chapters.map(ch => ({
            ...ch,
            lessons: ch.lessons.filter(l => l.id !== toDelete.item.id),
          })),
        };
      });
      if (
        (toDelete.type === 'lesson' && selectedLesson?.id === toDelete.item.id) ||
        (toDelete.type === 'chapter' && selectedLesson?.chapter_id === toDelete.item.id)
      ) {
        setSelectedLesson(null);
        setSelectedChapterId(null);
        setMobileSurface('curriculum');
      }
      setPendingDelete(null);
    } catch {
      setCourse(prevCourse ?? null);
      toast.danger('Unable to delete');
    } finally {
      setDeleting(false);
    }
  };

  const toggleLessonStatus = async (lesson: Lesson) => {
    const newStatus = lesson.status === 'published' ? 'draft' : 'published';
    const prevCourse = course;
    setCourse(c => {
      if (!c) return c;
      return {
        ...c,
        chapters: c.chapters.map(ch => ({
          ...ch,
          lessons: ch.lessons.map(l => (l.id === lesson.id ? {...l, status: newStatus} : l)),
        })),
      };
    });
    setSelectedLesson(l => (l?.id === lesson.id ? {...l, status: newStatus} : l));
    try {
      await apiClient.put(`/api/v1/course-lessons/${lesson.id}`, {
        status: newStatus,
      });
    } catch (e: any) {
      setCourse(prevCourse ?? null);
      setSelectedLesson(lesson);
      toast.danger(e.message ?? 'Unable to update status');
    }
  };

  const reorderChapters = async (oldIndex: number, newIndex: number) => {
    if (!course || reordering) return;

    const previousChapters = course.chapters;
    const chapters = moveItem(previousChapters, oldIndex, newIndex).map(
      (chapter, sortOrder) => ({...chapter, sort_order: sortOrder}),
    );
    setCourse(current => (current ? {...current, chapters} : current));
    setReordering('chapters');

    try {
      await apiClient.post(`/api/v1/courses/${course.id}/chapters/reorder`, {
        ordered_ids: chapters.map(chapter => chapter.id),
      });
    } catch {
      setCourse(current =>
        current ? {...current, chapters: previousChapters} : current,
      );
      toast.danger('Unable to save chapter order');
    } finally {
      setReordering(undefined);
    }
  };

  const reorderLessons = async (
    chapterId: number,
    oldIndex: number,
    newIndex: number,
  ) => {
    if (!course || reordering) return;

    const chapter = course.chapters.find(item => item.id === chapterId);
    if (!chapter) return;

    const previousLessons = chapter.lessons;
    const lessons = moveItem(previousLessons, oldIndex, newIndex).map(
      (lesson, sortOrder) => ({...lesson, sort_order: sortOrder}),
    );
    setCourse(current =>
      current
        ? {
            ...current,
            chapters: current.chapters.map(item =>
              item.id === chapterId ? {...item, lessons} : item,
            ),
          }
        : current,
    );
    setReordering(`lessons-${chapterId}`);

    try {
      await apiClient.post(
        `/api/v1/course-chapters/${chapterId}/lessons/reorder`,
        {
          ordered_ids: lessons.map(lesson => lesson.id),
        },
      );
    } catch {
      setCourse(current =>
        current
          ? {
              ...current,
              chapters: current.chapters.map(item =>
                item.id === chapterId
                  ? {...item, lessons: previousLessons}
                  : item,
              ),
            }
          : current,
      );
      toast.danger('Unable to save lesson order');
    } finally {
      setReordering(undefined);
    }
  };

  const moveChapterByOffset = (chapterId: number, offset: number) => {
    if (!course) return;

    const oldIndex = course.chapters.findIndex(
      chapter => chapter.id === chapterId,
    );
    const newIndex = oldIndex + offset;

    if (oldIndex < 0 || newIndex < 0 || newIndex >= course.chapters.length) {
      return;
    }

    void reorderChapters(oldIndex, newIndex);
  };

  const moveLessonByOffset = (
    chapterId: number,
    lessonId: number,
    offset: number,
  ) => {
    if (!course) return;

    const chapter = course.chapters.find(item => item.id === chapterId);
    if (!chapter) return;

    const oldIndex = chapter.lessons.findIndex(
      lesson => lesson.id === lessonId,
    );
    const newIndex = oldIndex + offset;

    if (oldIndex < 0 || newIndex < 0 || newIndex >= chapter.lessons.length) {
      return;
    }

    void reorderLessons(chapterId, oldIndex, newIndex);
  };

  const moveLesson = async (
    lesson: Lesson,
    sourceChapterId: number,
    targetChapterId: number,
  ) => {
    if (!course || reordering) return false;

    const previousCourse = course;
    setCourse(current =>
      current
        ? moveLessonInCourse(
            current,
            lesson.id,
            sourceChapterId,
            targetChapterId,
          )
        : current,
    );
    setReordering(`move-${lesson.id}`);

    try {
      await apiClient.post(`/api/v1/course-lessons/${lesson.id}/move`, {
        target_chapter_id: targetChapterId,
        position: 0,
      });
      return true;
    } catch (e: any) {
      setCourse(previousCourse);
      toast.danger(e?.message ?? 'Unable to move lesson');
      return false;
    } finally {
      setReordering(undefined);
    }
  };

  const submit = async () => {
    if (!course) return;
    setPublishing(true);
    try {
      await apiClient.post(
        `/api/v1/digital-products/${course.digital_product_id}/submit`,
      );
      toast.positive('Course submitted for review');
      setCourse(c => (c ? {...c, product: {...c.product, status: 'pending_approval'}} : c));
    } catch (e: any) {
      toast.danger(e.message ?? 'Unable to submit course');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle>
            <Trans message="Course Builder" />
          </DashboardLayout.SectionTitle>
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden border-b bg-card p-3 lg:w-[36%] lg:border-r lg:border-b-0">
              <div className="flex items-center justify-between gap-2 border-b pb-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-28" />
              </div>
              <div className="space-y-3 p-3">
                <Skeleton className="h-16 w-full rounded-card" />
                <Skeleton className="h-12 w-full rounded-card" />
                <Skeleton className="h-12 w-full rounded-card" />
                <Skeleton className="h-9 w-28" />
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col bg-muted/10 p-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="mt-4 h-32 w-full rounded-card" />
              <Skeleton className="mt-4 h-20 w-full rounded-card" />
            </div>
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  if (error || !course) {
    return (
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionContent className="p-6">
          <Alert.Root variant="destructive" fillStyle="subtleFill">
            <Alert.Description>{error ?? 'Course not found'}</Alert.Description>
          </Alert.Root>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  const canSubmit =
    course.product.status === 'draft' || course.product.status === 'rejected';
  const hasPublishedLesson = course.chapters.some(chapter =>
    chapter.lessons.some(lesson => lesson.status === 'published'),
  );

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Course Builder" />
          {course.product.status === 'approved' && (
            <Badge variant="positive" className="ml-2">
              <Trans message="Published" />
            </Badge>
          )}
          {course.product.status === 'pending_approval' && (
            <Badge variant="secondary" className="ml-2">
              <Trans message="In review" />
            </Badge>
          )}
        </DashboardLayout.SectionTitle>
        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                window.open(
                  `/dashboard/my-products/${productId}/course/preview`,
                  '_blank',
                )
              }
            >
              <EyeIcon />
              <Trans message="Preview" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon />
              <Trans message="Configure" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  to={`/dashboard/my-products/${productId}/course/analytics`}
                />
              }
            >
              <BarChart3Icon data-icon="inline-start" />
              Analytics
            </Button>
          </div>
          <Dropdown.Root>
            <Dropdown.Trigger
              render={
                <Button
                  aria-label="Course actions"
                  size="icon-sm"
                  variant="outline"
                  className="lg:hidden"
                >
                  <MoreHorizontalIcon />
                </Button>
              }
            />
            <Dropdown.Content align="end">
              <Dropdown.Item
                onClick={() =>
                  window.open(
                    `/dashboard/my-products/${productId}/course/preview`,
                    '_blank',
                  )
                }
              >
                <EyeIcon />
                <Trans message="Preview" />
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
                <Trans message="Configure" />
              </Dropdown.Item>
              <Dropdown.Item
                render={
                  <Link
                    to={`/dashboard/my-products/${productId}/course/analytics`}
                  />
                }
              >
                <BarChart3Icon />
                Analytics
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>
          <Button
            size="sm"
            onClick={() => void submit()}
            disabled={publishing || !canSubmit || !hasPublishedLesson}
          >
            <Trans
              message={
                publishing
                  ? 'Submitting...'
                  : hasPublishedLesson
                    ? 'Submit for review'
                    : 'Add a published lesson'
              }
            />
          </Button>
        </div>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Curriculum */}
          <div
            className={cn(
              'flex min-h-0 w-full min-w-0 flex-col overflow-hidden border-b bg-card lg:w-[36%] lg:border-r lg:border-b-0',
              mobileSurface === 'editor' && 'hidden lg:flex',
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b p-3">
              <h2 className="text-sm font-semibold">
                <Trans message="Curriculum" />
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void addChapter()}
              >
                <PlusIcon />
                <Trans message="New chapter" />
              </Button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <ScrollAreaViewport className="p-3">
                <div className="flex flex-col gap-3">
                  {course.chapters.length === 0 ? (
                    <Empty.Root>
                      <Empty.Header>
                        <Empty.Media variant="icon">
                          <GraduationCapIcon />
                        </Empty.Media>
                        <Empty.Title>
                          <Trans message="Build your course" />
                        </Empty.Title>
                        <Empty.Description>
                          <Trans message="Start by adding your first chapter." />
                        </Empty.Description>
                      </Empty.Header>
                      <Button size="sm" onClick={() => void addChapter()}>
                        <PlusIcon />
                        <Trans message="Add chapter" />
                      </Button>
                    </Empty.Root>
                  ) : (
                    course.chapters.map((chapter, chapterIndex) => (
                      <SortableCurriculumItem
                        key={chapter.id}
                        id={`course-builder-chapter-${chapter.id}`}
                        items={course.chapters.map(
                          item => `course-builder-chapter-${item.id}`,
                        )}
                        type={`course-builder-chapters-${course.id}`}
                        disabled={!!reordering}
                        onSortEnd={reorderChapters}
                      >
                        {dragHandleRef => (
                          <Collapsible
                            defaultOpen
                            className="overflow-hidden rounded-xl border bg-background"
                          >
                            <div className="flex items-center gap-2 bg-muted/30 p-2">
                              <div className="hidden lg:block">
                                <button
                                  ref={dragHandleRef}
                                  type="button"
                                  aria-label="Reorder chapter"
                                  disabled={!!reordering}
                                  className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <GripVerticalIcon className="size-4" />
                                </button>
                              </div>
                              <CollapsibleTrigger
                                aria-label="Toggle chapter lessons"
                                className="group flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                <ChevronDownIcon className="size-4 transition-transform group-data-panel-open:rotate-180" />
                              </CollapsibleTrigger>
                              <Input
                                className="h-8 flex-1 border-0 bg-transparent text-sm font-medium focus-visible:ring-1"
                                defaultValue={chapter.title}
                                onBlur={e =>
                                  void updateChapterTitle(
                                    chapter.id,
                                    e.target.value,
                                  )
                                }
                                onKeyDown={e => {
                                  if (e.key === 'Enter')
                                    (e.target as HTMLInputElement).blur();
                                }}
                              />
                              <Dropdown.Root>
                                <Dropdown.Trigger
                                  render={
                                    <Button
                                      aria-label="Chapter actions"
                                      size="icon-sm"
                                      variant="ghost"
                                    >
                                      <MoreHorizontalIcon className="size-4" />
                                    </Button>
                                  }
                                />
                                <Dropdown.Content align="end">
                                  <Dropdown.Item
                                    disabled={
                                      chapterIndex === 0 || !!reordering
                                    }
                                    onClick={() =>
                                      moveChapterByOffset(chapter.id, -1)
                                    }
                                  >
                                    <Trans message="Move up" />
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    disabled={
                                      chapterIndex ===
                                        course.chapters.length - 1 ||
                                      !!reordering
                                    }
                                    onClick={() =>
                                      moveChapterByOffset(chapter.id, 1)
                                    }
                                  >
                                    <Trans message="Move down" />
                                  </Dropdown.Item>
                                </Dropdown.Content>
                              </Dropdown.Root>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => deleteChapter(chapter)}
                              >
                                <Trash2Icon className="size-4" />
                              </Button>
                            </div>
                            <CollapsibleContent>
                              <div className="flex flex-col gap-1 p-2">
                                {chapter.lessons.length === 0 ? (
                                  <p className="py-3 text-center text-xs text-muted-foreground">
                                    <Trans message="This chapter has no lessons yet." />
                                  </p>
                                ) : (
                                  chapter.lessons.map((lesson, lessonIndex) => (
                                    <SortableCurriculumItem
                                      key={lesson.id}
                                      id={`course-builder-lesson-${lesson.id}`}
                                      items={chapter.lessons.map(
                                        item =>
                                          `course-builder-lesson-${item.id}`,
                                      )}
                                      type={`course-builder-lessons-${chapter.id}`}
                                      disabled={!!reordering}
                                      onSortEnd={(oldIndex, newIndex) =>
                                        void reorderLessons(
                                          chapter.id,
                                          oldIndex,
                                          newIndex,
                                        )
                                      }
                                    >
                                      {dragHandleRef => (
                                        <div
                                          className={cn(
                                            'flex items-center gap-2 rounded-card border p-2 text-sm',
                                            selectedLesson?.id === lesson.id
                                              ? 'bg-primary/5 ring-1 ring-primary/20'
                                              : 'bg-card hover:bg-muted/30',
                                          )}
                                        >
                                          <div className="hidden lg:block">
                                            <button
                                              ref={dragHandleRef}
                                              type="button"
                                              aria-label="Reorder lesson"
                                              disabled={!!reordering}
                                              className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                              <GripVerticalIcon className="size-3.5" />
                                            </button>
                                          </div>
                                          <VideoIcon className="size-3.5 text-muted-foreground" />
                                          <button
                                            className="flex-1 truncate text-left font-medium"
                                            onClick={() => {
                                              setSelectedLesson(lesson);
                                              setSelectedChapterId(chapter.id);
                                              setMobileSurface('editor');
                                            }}
                                          >
                                            {lesson.title}
                                          </button>
                                          <Badge
                                            variant={
                                              lesson.status === 'published'
                                                ? 'positive'
                                                : 'outline'
                                            }
                                            className="h-5 shrink-0 px-1.5 text-[10px]"
                                          >
                                            <Trans
                                              message={
                                                lesson.status === 'published'
                                                  ? 'Published'
                                                  : 'Draft'
                                              }
                                            />
                                          </Badge>
                                          <Dropdown.Root>
                                            <Dropdown.Trigger
                                              render={
                                                <Button
                                                  aria-label="Lesson actions"
                                                  size="icon-sm"
                                                  variant="ghost"
                                                >
                                                  <MoreHorizontalIcon className="size-4" />
                                                </Button>
                                              }
                                            />
                                            <Dropdown.Content align="end">
                                              <Dropdown.Item
                                                disabled={
                                                  lessonIndex === 0 ||
                                                  !!reordering
                                                }
                                                onClick={() =>
                                                  moveLessonByOffset(
                                                    chapter.id,
                                                    lesson.id,
                                                    -1,
                                                  )
                                                }
                                              >
                                                <Trans message="Move up" />
                                              </Dropdown.Item>
                                              <Dropdown.Item
                                                disabled={
                                                  lessonIndex ===
                                                    chapter.lessons.length -
                                                      1 || !!reordering
                                                }
                                                onClick={() =>
                                                  moveLessonByOffset(
                                                    chapter.id,
                                                    lesson.id,
                                                    1,
                                                  )
                                                }
                                              >
                                                <Trans message="Move down" />
                                              </Dropdown.Item>
                                              <Dropdown.Item
                                                onClick={() =>
                                                  void toggleLessonStatus(
                                                    lesson,
                                                  )
                                                }
                                              >
                                                <Trans
                                                  message={
                                                    lesson.status ===
                                                    'published'
                                                      ? 'Unpublish'
                                                      : 'Publish'
                                                  }
                                                />
                                              </Dropdown.Item>
                                              <Dropdown.Item
                                                onClick={async () => {
                                                  if (reordering) return;
                                                  try {
                                                    setReordering(`duplicate-${lesson.id}`);
                                                    const res = await apiClient.post(
                                                      `/api/v1/course-lessons/${lesson.id}/duplicate`,
                                                    );
                                                    const dup = (res.data as any).data as Lesson;
                                                    setCourse(c => {
                                                      if (!c) return c;
                                                      return {
                                                        ...c,
                                                        chapters: c.chapters.map(ch =>
                                                          ch.id === lesson.chapter_id
                                                            ? {...ch, lessons: [...ch.lessons, dup].sort((a,b)=>a.sort_order-b.sort_order)}
                                                            : ch,
                                                        ),
                                                      };
                                                    });
                                                  } catch (e: any) {
                                                    toast.danger(e?.message ?? 'Unable to duplicate lesson');
                                                  } finally {
                                                    setReordering(undefined);
                                                  }
                                                }}
                                              >
                                                <CopyIcon />
                                                <Trans message="Duplicate" />
                                              </Dropdown.Item>
                                              {course.chapters.length > 1 && (
                                                <Dropdown.Item
                                                  disabled={!!reordering}
                                                  onClick={() =>
                                                    setMoveRequest({
                                                      lesson,
                                                      sourceChapter: chapter,
                                                    })
                                                  }
                                                >
                                                  <Trans message="Move to chapter" />
                                                </Dropdown.Item>
                                              )}
                                              <Dropdown.Item
                                                variant="destructive"
                                                onClick={() =>
                                                  deleteLesson(lesson)
                                                }
                                              >
                                                <Trash2Icon />
                                                <Trans message="Delete" />
                                              </Dropdown.Item>
                                            </Dropdown.Content>
                                          </Dropdown.Root>
                                        </div>
                                      )}
                                    </SortableCurriculumItem>
                                  ))
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="w-full"
                                  onClick={() => void addLesson(chapter.id)}
                                >
                                  <PlusIcon />
                                  <Trans message="New lesson" />
                                </Button>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </SortableCurriculumItem>
                    ))
                  )}
                </div>
              </ScrollAreaViewport>
              <ScrollAreaScrollBar onlyShowOnHover />
            </ScrollArea>
          </div>

          {/* Editor */}
          <div
            className={cn(
              'flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-muted/10 p-4',
              mobileSurface === 'curriculum' && 'hidden lg:flex',
            )}
          >
            {selectedLesson ? (
              <LessonEditor
                lesson={selectedLesson}
                chapterId={selectedChapterId}
                onSaved={load}
                onSelectLesson={setSelectedLesson}
                onBackToCurriculum={() => setMobileSurface('curriculum')}
              />
            ) : (
              <Empty.Root className="m-auto">
                <Empty.Header>
                  <Empty.Media variant="icon">
                    <PencilIcon />
                  </Empty.Media>
                  <Empty.Title>
                    <Trans message="Select a lesson to edit" />
                  </Empty.Title>
                  <Empty.Description>
                    <Trans message="Choose a lesson from the curriculum to edit its video, content and resources." />
                  </Empty.Description>
                </Empty.Header>
              </Empty.Root>
            )}
          </div>
        </div>
      </DashboardLayout.SectionContent>

      <CourseSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        course={course}
        onSaved={load}
      />
      <DeleteCourseItemDialog
        item={pendingDelete}
        deleting={deleting}
        onOpenChange={open => {
          if (!open && !deleting) setPendingDelete(null);
        }}
        onDelete={() => void confirmDelete()}
      />
      {moveRequest && (
        <MoveLessonDialog
          course={course}
          lesson={moveRequest.lesson}
          sourceChapter={moveRequest.sourceChapter}
          open
          onOpenChange={open => {
            if (!open) setMoveRequest(null);
          }}
          onMoved={targetChapterId =>
            moveLesson(
              moveRequest.lesson,
              moveRequest.sourceChapter.id,
              targetChapterId,
            )
          }
        />
      )}
    </DashboardLayout.MainSection>
  );
}

function moveLessonInCourse(
  course: Course,
  lessonId: number,
  sourceChapterId: number,
  targetChapterId: number,
): Course {
  const lesson = course.chapters
    .find(chapter => chapter.id === sourceChapterId)
    ?.lessons.find(item => item.id === lessonId);

  if (!lesson) return course;

  return {
    ...course,
    chapters: course.chapters.map(chapter => {
      if (chapter.id === sourceChapterId) {
        return {
          ...chapter,
          lessons: chapter.lessons
            .filter(item => item.id !== lessonId)
            .map((item, sortOrder) => ({...item, sort_order: sortOrder})),
        };
      }

      if (chapter.id === targetChapterId) {
        return {
          ...chapter,
          lessons: [
            {...lesson, chapter_id: targetChapterId},
            ...chapter.lessons,
          ].map((item, sortOrder) => ({...item, sort_order: sortOrder})),
        };
      }

      return chapter;
    }),
  };
}

function MoveLessonDialog({
  course,
  lesson,
  sourceChapter,
  open,
  onOpenChange,
  onMoved,
}: {
  course: Course;
  lesson: Lesson;
  sourceChapter: Chapter;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoved: (targetChapterId: number) => Promise<boolean>;
}) {
  const [targetChapterId, setTargetChapterId] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);
  const targets = course.chapters.filter(
    chapter => chapter.id !== sourceChapter.id,
  );

  const close = () => {
    setTargetChapterId(null);
    onOpenChange(false);
  };

  const move = async () => {
    if (targetChapterId === null || moving) return;

    setMoving(true);
    try {
      if (await onMoved(targetChapterId)) close();
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={open => (open ? undefined : close())}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="w-[calc(100%-2rem)] sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Move lesson" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message={`Choose a chapter for "${lesson.title}".`} />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            <Field.Root>
              <Field.Label>
                <Trans message="Destination chapter" />
              </Field.Label>
              <Select.Root
                value={
                  targetChapterId === null ? null : String(targetChapterId)
                }
                onValueChange={value => setTargetChapterId(Number(value))}
              >
                <Select.Trigger className="w-full">
                  <Select.Value
                    placeholder={<Trans message="Select a chapter" />}
                  />
                </Select.Trigger>
                <Select.Content>
                  <Select.Group>
                    {targets.map(chapter => (
                      <Select.Item key={chapter.id} value={String(chapter.id)}>
                        {chapter.title}
                      </Select.Item>
                    ))}
                  </Select.Group>
                </Select.Content>
              </Select.Root>
            </Field.Root>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={close} disabled={moving}>
              <Trans message="Cancel" />
            </Button>
            <Button
              onClick={() => void move()}
              disabled={targetChapterId === null || moving}
            >
              <Trans message={moving ? 'Moving...' : 'Move lesson'} />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function moveItem<T>(items: T[], oldIndex: number, newIndex: number): T[] {
  if (
    oldIndex === newIndex ||
    oldIndex < 0 ||
    newIndex < 0 ||
    oldIndex >= items.length ||
    newIndex >= items.length
  ) {
    return items;
  }

  const reordered = [...items];
  const [item] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, item);

  return reordered;
}

function SortableCurriculumItem({
  id,
  items,
  type,
  disabled,
  onSortEnd,
  children,
}: {
  id: string;
  items: string[];
  type: string;
  disabled: boolean;
  onSortEnd: (oldIndex: number, newIndex: number) => void;
  children: (dragHandleRef: RefObject<HTMLButtonElement | null>) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const {sortableProps, dragHandleRef} = useSortable({
    item: id,
    items,
    type,
    ref,
    disabled,
    onSortEnd,
  });

  return (
    <div ref={ref} {...sortableProps}>
      {children(dragHandleRef)}
    </div>
  );
}

function LessonEditor({
  lesson,
  chapterId,
  onSaved,
  onSelectLesson,
  onBackToCurriculum,
}: {
  lesson: Lesson;
  chapterId: number | null;
  onSaved: () => void;
  onSelectLesson: (l: Lesson) => void;
  onBackToCurriculum: () => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [status, setStatus] = useState(lesson.status);
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? '');
  const [content, setContent] = useState(lesson.content ?? '');
  const [saving, setSaving] = useState(false);
  const [resources, setResources] = useState<LessonResource[]>(
    lesson.resources ?? [],
  );
  const {uploadFile, uploadStatus, percentage} = useActiveUpload();

  useEffect(() => {
    setTitle(lesson.title);
    setStatus(lesson.status);
    setVideoUrl(lesson.video_url ?? '');
    setContent(lesson.content ?? '');
    setResources(lesson.resources ?? []);
  }, [lesson]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put(`/api/v1/course-lessons/${lesson.id}`, {
        title,
        content,
        status,
        video_type: videoUrl ? 'external' : lesson.video_type,
        video_url: videoUrl || null,
      });
      const updated = (res.data as any).data as Lesson;
      onSelectLesson(updated);
      toast.positive('Lesson saved');
      onSaved();
    } catch (e: any) {
      toast.danger(e.message ?? 'Unable to save');
    } finally {
      setSaving(false);
    }
  };

  const uploadVideo = (file: File) => {
    uploadFile(file, {
      uploadType: 'courseVideos',
      showToastOnRestrictionFail: true,
      showToastOnBackendError: true,
      onSuccess: async entry => {
        try {
          await apiClient.put(`/api/v1/course-lessons/${lesson.id}`, {
            video_type: 'upload',
            video_file_entry_id: entry.id,
          });
          toast.positive('Video uploaded');
          onSaved();
        } catch {
          toast.danger('Unable to attach the uploaded video');
        }
      },
    });
  };

  const uploadResource = (file: File) => {
    uploadFile(file, {
      uploadType: 'courseResources',
      showToastOnRestrictionFail: true,
      showToastOnBackendError: true,
      onSuccess: async entry => {
        try {
          await apiClient.post(
            `/api/v1/course-lessons/${lesson.id}/resources`,
            {file_entry_id: entry.id},
          );
          onSaved();
        } catch {
          toast.danger('Unable to attach the resource');
        }
      },
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Button
        variant="ghost"
        size="sm"
        className="self-start lg:hidden"
        onClick={onBackToCurriculum}
      >
        <ArrowLeftIcon data-icon="inline-start" />
        <Trans message="Back to curriculum" />
      </Button>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Chapter {chapterId} • Lesson editor
        </p>
        <Badge variant={status === 'published' ? 'positive' : 'outline'}>
          {status}
        </Badge>
      </div>

      <Field.Root>
        <Field.Label>
          <Trans message="Lesson title" />
        </Field.Label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Lesson title"
        />
      </Field.Root>

      <Card.Root className="gap-0 py-0">
        <Card.Header className="p-4">
          <Card.Title className="text-sm">
            <Trans message="Video" />
          </Card.Title>
          <Card.Description>
            <Trans message="Upload a video or paste a YouTube/Vimeo URL." />
          </Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 p-4 pt-0">
          <FileDropzone
            accept="video/*"
            title={<Trans message="Upload a video" />}
            description={<Trans message="Drag and drop or click to browse" />}
            hint=".mp4, .mov, .mpeg, or .webm"
            status={uploadStatus === 'inProgress' ? 'uploading' : 'idle'}
            progress={percentage}
            onFile={uploadVideo}
          />
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Field.Root>
            <Field.Label>
              <Trans message="Video URL" />
            </Field.Label>
            <Input
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <Field.Description>
              <Trans message="Paste a YouTube or Vimeo URL" />
            </Field.Description>
          </Field.Root>
          {lesson.video && (
            <div className="rounded-card border bg-muted/20 p-3 text-xs">
              Current: {lesson.video.name} —{' '}
              <a href={lesson.video.url} target="_blank" className="underline">
                View
              </a>
            </div>
          )}
        </Card.Content>
      </Card.Root>

      <Field.Root>
        <Field.Label>
          <Trans message="Content" />
        </Field.Label>
        <TipTapEditorProvider
          key={lesson.id}
          extensions={articleEditorTipTapExtensions}
          initialContent={content}
          onChange={setContent}
        >
          <div className="overflow-hidden rounded-card border">
            <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 p-2">
              <FormatDropdown />
              <Divider />
              <FontStyleButtons />
              <Divider />
              <ListButtons />
              <Divider />
              <LinkButton />
              <Divider />
              <ClearFormatButton />
            </div>
            <TiptapEditorContent className="prose prose-sm min-h-[180px] max-w-none p-3" />
          </div>
        </TipTapEditorProvider>
      </Field.Root>

      <Field.Root>
        <Field.Label>
          <Trans message="File attachments" />
        </Field.Label>
        <FileDropzone
          title={<Trans message="Upload attachment" />}
          description={<Trans message="Drag and drop or click to browse" />}
          onFile={uploadResource}
        />
        {!!resources.length && (
          <div className="divide-y rounded-card border">
            {resources.map(r => (
              <div key={r.id} className="flex items-center gap-2 p-2 text-sm">
                <span className="flex-1 truncate">{r.display_name}</span>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={async () => {
                    await apiClient.delete(
                      `/api/v1/course-lesson-resources/${r.id}`,
                    );
                    onSaved();
                  }}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Field.Root>

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={status === 'published'}
            onCheckedChange={v => setStatus(v ? 'published' : 'draft')}
          />
          <Trans message="Published" />
        </label>
        <Button onClick={() => void save()} disabled={saving}>
          <Trans message={saving ? 'Saving...' : 'Save changes'} />
        </Button>
      </div>
    </div>
  );
}

type CourseSettingsContentProps = {
  inputId: string;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  coverUrl: string;
  setCoverUrl: (value: string) => void;
  setCoverFileId: (value: number | null) => void;
  price: string;
  setPrice: (value: string) => void;
  requireSeq: boolean;
  setRequireSeq: (value: boolean) => void;
  biolinks: Biolink[];
  biolinkIds: number[];
  setBiolinkIds: (value: number[]) => void;
};

function CourseSettingsContent({
  inputId,
  title,
  setTitle,
  description,
  setDescription,
  coverUrl,
  setCoverUrl,
  setCoverFileId,
  price,
  setPrice,
  requireSeq,
  setRequireSeq,
  biolinks,
  biolinkIds,
  setBiolinkIds,
}: CourseSettingsContentProps) {
  return (
    <div className="flex flex-col gap-6">
      <Field.Root>
        <Field.Label htmlFor={inputId}>
          <Trans message="Course Name" />
        </Field.Label>
        <Input
          id={inputId}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Enter a course name"
          maxLength={160}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label htmlFor={`${inputId}-description`}>
          <Trans message="Description" />
        </Field.Label>
        <Input
          id={`${inputId}-description`}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What will students learn?"
          maxLength={20000}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>
          <Trans message="Cover Image" />
        </Field.Label>
        <div className="flex w-full flex-col gap-3">
          {coverUrl && (
            <div className="overflow-hidden rounded-xl border">
              <ProductCover cover={{url: coverUrl}} className="aspect-video" />
            </div>
          )}
          <CoverImageDropzone
            coverUrl={coverUrl}
            onCoverChange={(url, id) => {
              setCoverUrl(url);
              setCoverFileId(id);
            }}
          />
          <p className="text-xs text-muted-foreground">
            <Trans message="Recommended size: 1200x514px • Max size: 5MB" />
          </p>
          {coverUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCoverUrl('');
                setCoverFileId(null);
              }}
            >
              <Trans message="Remove cover" />
            </Button>
          )}
        </div>
      </Field.Root>

      <Field.Root>
        <Field.Label>
          <Trans message="Price (ETB)" />
        </Field.Label>
        <Input
          value={price}
          onChange={e => setPrice(e.target.value)}
          type="number"
          min="0"
          step="0.01"
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>
          <Trans message="Storefront placement" />
        </Field.Label>
        {!biolinks.length ? (
          <Field.Description>
            <Trans message="You can sell this course directly. Create a Storefront later if you want to display it there." />
          </Field.Description>
        ) : (
          <div className="divide-y rounded-lg border px-3">
            {biolinks.map(biolink => (
              <label
                key={biolink.id}
                className="flex cursor-pointer items-center gap-3 py-3 text-sm transition-colors hover:bg-muted/40"
              >
                <Checkbox
                  bindToHookForm={false}
                  checked={biolinkIds.includes(biolink.id)}
                  onCheckedChange={checked =>
                    setBiolinkIds(
                      checked
                        ? [...biolinkIds, biolink.id]
                        : biolinkIds.filter(id => id !== biolink.id),
                    )
                  }
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {biolink.name}
                  </span>
                  {biolink.short_url && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {biolink.short_url}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}
      </Field.Root>

      <Field.Root>
        <Field.Label htmlFor={`${inputId}-require-lesson-completion`}>
          <Trans message="Learning Settings" />
        </Field.Label>
        <div className="flex items-center justify-between gap-6 rounded-lg border p-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">
              <Trans message="Require students to complete lessons in order" />
            </p>
            <p className="text-sm text-muted-foreground">
              <Trans message="Students must complete lessons before moving to the next one" />
            </p>
          </div>
          <Switch
            id={`${inputId}-require-lesson-completion`}
            checked={requireSeq}
            onCheckedChange={setRequireSeq}
          />
        </div>
      </Field.Root>
    </div>
  );
}

function CourseSettingsDialog({
  open,
  onOpenChange,
  course,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: Course;
  onSaved: () => void;
}) {
  const isDesktop = useMediaQuery('(min-width: 1024px)') ?? false;
  const [title, setTitle] = useState(course.product.title);
  const [description, setDescription] = useState(
    course.product.description ?? '',
  );
  const [coverUrl, setCoverUrl] = useState(course.product.cover?.url ?? '');
  const [coverFileId, setCoverFileId] = useState<number | null>(
    course.product.cover?.id ?? null,
  );
  const [requireSeq, setRequireSeq] = useState(
    course.require_sequential_completion,
  );
  const [biolinks, setBiolinks] = useState<Biolink[]>([]);
  const [biolinkIds, setBiolinkIds] = useState(
    course.product.biolink_ids ?? [],
  );
  const [price, setPrice] = useState(
    (course.product.price_cents / 100).toFixed(2),
  );
  const [discardOpen, setDiscardOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(course.product.title);
    setDescription(course.product.description ?? '');
    setCoverUrl(course.product.cover?.url ?? '');
    setCoverFileId(course.product.cover?.id ?? null);
    setRequireSeq(course.require_sequential_completion);
    setBiolinkIds(course.product.biolink_ids ?? []);
    setPrice((course.product.price_cents / 100).toFixed(2));
  }, [course]);

  useEffect(() => {
    if (!open) return;

    void apiClient
      .get('/api/v1/biolinks?fields_preset=minimal')
      .then(response => setBiolinks(response.data.data ?? []))
      .catch(() => setBiolinks([]));
  }, [open]);

  const reset = () => {
    setTitle(course.product.title);
    setDescription(course.product.description ?? '');
    setCoverUrl(course.product.cover?.url ?? '');
    setCoverFileId(course.product.cover?.id ?? null);
    setRequireSeq(course.require_sequential_completion);
    setBiolinkIds(course.product.biolink_ids ?? []);
    setPrice((course.product.price_cents / 100).toFixed(2));
  };

  const hasPlacementChanges =
    biolinkIds.length !== (course.product.biolink_ids ?? []).length ||
    biolinkIds.some(id => !(course.product.biolink_ids ?? []).includes(id));
  const isDirty =
    title !== course.product.title ||
    description !== (course.product.description ?? '') ||
    coverFileId !== (course.product.cover?.id ?? null) ||
    price !== (course.product.price_cents / 100).toFixed(2) ||
    requireSeq !== course.require_sequential_completion ||
    hasPlacementChanges;

  const requestClose = (nextOpen: boolean) => {
    if (!nextOpen && saving) return;
    if (!nextOpen && isDirty) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(nextOpen);
  };

  const discard = () => {
    if (saving) return;
    reset();
    setDiscardOpen(false);
    onOpenChange(false);
  };

  const save = async () => {
    if (saving) return;

    const cents = Math.round(Number(price || '0') * 100);
    setSaving(true);
    try {
      await apiClient.put(`/api/v1/courses/${course.id}`, {
        title: title.trim() || course.product.title,
        description: description.trim() || null,
        price_cents: Number.isFinite(cents)
          ? cents
          : course.product.price_cents,
        cover_file_entry_id: coverFileId,
        require_sequential_completion: requireSeq,
        biolink_ids: biolinkIds,
      });
      toast.positive('Settings saved');
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.danger(e.message ?? 'Unable to save settings');
    } finally {
      setSaving(false);
    }
  };

  const contentProps = {
    title,
    setTitle,
    description,
    setDescription,
    coverUrl,
    setCoverUrl,
    setCoverFileId,
    price,
    setPrice,
    requireSeq,
    setRequireSeq,
    biolinks,
    biolinkIds,
    setBiolinkIds,
  };

  return (
    <>
      <Drawer.Root
        open={open && !isDesktop}
        onOpenChange={requestClose}
        position="bottom"
      >
        <Drawer.Portal>
          <Drawer.Backdrop />
          <Drawer.Content className="lg:hidden">
            <Drawer.Header>
              <Drawer.Title>
                <Trans message="Course Settings" />
              </Drawer.Title>
              <Drawer.Description>
                <Trans message="Manage your course cover image and other settings" />
              </Drawer.Description>
            </Drawer.Header>
            <Drawer.Body>
              <CourseSettingsContent
                {...contentProps}
                inputId="course-name-mobile"
              />
            </Drawer.Body>
            <Drawer.Footer className="border-t pt-4">
              <Button
                variant="outline"
                onClick={() => requestClose(false)}
                disabled={saving}
              >
                <Trans message="Cancel" />
              </Button>
              <Button onClick={() => void save()} disabled={saving}>
                <Trans message={saving ? 'Saving...' : 'Save'} />
              </Button>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
      <Dialog.Root open={open && isDesktop} onOpenChange={requestClose}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content className="hidden max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl lg:flex">
            <Dialog.Header className="border-b px-4 pt-4 pb-4 sm:px-6 sm:pt-6">
              <Dialog.Title>
                <Trans message="Course Settings" />
              </Dialog.Title>
              <Dialog.Description>
                <Trans message="Manage your course cover image and other settings" />
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body className="mx-0 flex-1 px-4 py-5 sm:px-6">
              <CourseSettingsContent
                {...contentProps}
                inputId="course-name-desktop"
              />
            </Dialog.Body>
            <Dialog.Footer className="mx-0 mb-0 border-t px-4 py-4 sm:px-6">
              <Button
                variant="outline"
                onClick={() => requestClose(false)}
                disabled={saving}
              >
                <Trans message="Cancel" />
              </Button>
              <Button onClick={() => void save()} disabled={saving}>
                <Trans message={saving ? 'Saving...' : 'Save'} />
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <AlertDialog.Root
        open={discardOpen}
        onOpenChange={open => !open && setDiscardOpen(false)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Title>
                <Trans message="Discard changes?" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="Your unsaved course settings will be lost." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel disabled={saving}>
                <Trans message="Keep editing" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                color="danger"
                onClick={discard}
                disabled={saving}
              >
                <Trans message="Discard changes" />
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

function DeleteCourseItemDialog({
  item,
  deleting,
  onOpenChange,
  onDelete,
}: {
  item: PendingDelete | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
}) {
  const isChapter = item?.type === 'chapter';
  const itemName = item?.item.title ?? '';

  return (
    <AlertDialog.Root open={item !== null} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Media className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialog.Media>
            <AlertDialog.Title>
              <Trans message={`Delete "${itemName}"?`} />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans
                message={
                  isChapter
                    ? 'This chapter and all of its lessons will be permanently deleted.'
                    : 'This lesson will be permanently deleted.'
                }
              />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={deleting}>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deleting}
              onClick={onDelete}
            >
              <Trans message={deleting ? 'Deleting...' : 'Delete'} />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function CoverImageDropzone({
  coverUrl,
  onCoverChange,
}: {
  coverUrl: string;
  onCoverChange: (url: string, id: number | null) => void;
}) {
  const {uploadFile, uploadStatus, percentage} = useActiveUpload();
  const uploading = uploadStatus === 'inProgress';
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const handleFile = (file: File) => {
    setPendingFile(file);
    setCropOpen(true);
  };

  const handleCrop = (preview: string, croppedFile?: File) => {
    if (!croppedFile) return;
    uploadFile(croppedFile, {
      uploadType: 'linkImages',
      showToastOnRestrictionFail: true,
      showToastOnBackendError: true,
      onSuccess: entry => {
        onCoverChange(entry.url, entry.id);
        setCropOpen(false);
        setPendingFile(null);
      },
    });
  };

  return (
    <>
      <FileDropzone
        accept="image/*"
        title={<Trans message="Upload Cover Image" />}
        description={<Trans message="Drag and drop or click to browse" />}
        hint="1200x514 • 5MB"
        status={uploading ? 'uploading' : 'idle'}
        progress={percentage}
        onFile={handleFile}
        className={coverUrl ? 'border-muted' : undefined}
      />
      {pendingFile && (
        <Dialog.Root open={cropOpen} onOpenChange={setCropOpen}>
          <ImageCrop aspect={16 / 9} file={pendingFile} onCrop={handleCrop}>
            <Dialog.Portal>
              <Dialog.Backdrop />
              <Dialog.Content className="max-w-[calc(100vw-2rem)] sm:max-w-xl">
                <Dialog.Header>
                  <Dialog.Title>
                    <Trans message="Crop cover image" />
                  </Dialog.Title>
                  <Dialog.Description>
                    <Trans message="Adjust the preferred region, then apply." />
                  </Dialog.Description>
                </Dialog.Header>
                <Dialog.Body>
                  <ImageCropContent />
                </Dialog.Body>
                <Dialog.Footer className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <ImageCropReset asChild>
                    <Button type="button" variant="ghost">
                      <Trans message="Reset" />
                    </Button>
                  </ImageCropReset>
                  <Dialog.CloseButton variant="outline">
                    <Trans message="Cancel" />
                  </Dialog.CloseButton>
                  <ImageCropApply asChild>
                    <Button type="button">
                      <Trans message="Apply crop" />
                    </Button>
                  </ImageCropApply>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Portal>
          </ImageCrop>
        </Dialog.Root>
      )}
    </>
  );
}
