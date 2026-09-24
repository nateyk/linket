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
import {useCurrentTextEditor} from '@common/text-editor/tiptap-editor-context';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {CroppedCover} from '@common/uploads/components/cropped-image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@shadcn/forms/input-group/input-group';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Select} from '@shadcn/forms/select/select';
import {Tabs} from '@shadcn/tabs/tabs';
import {Tooltip} from '@shadcn/tooltip/tooltip';

import {
  ScrollArea,
  ScrollAreaScrollBar,
  ScrollAreaViewport,
} from '@shadcn/scroll-area/scroll-area';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Spinner} from '@shadcn/spinner/spinner';
import {Switch} from '@shadcn/forms/switch/switch';
import {SharedFileUploader} from '@common/ui/file-uploader';
import {Trans} from '@ui/i18n/trans';
import {useSortable} from '@ui/interactions/dnd/sortable/use-sortable';
import {toast} from '@ui/toast/toast';
import {cn} from '@ui/utils/cn';
import {useMediaQuery} from '@ui/utils/hooks/use-media-query';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@shadcn/collapsible/collapsible';
import {
  ArrowLeftIcon,
  BarChart3Icon,
  ChevronDownIcon,
  CopyIcon,
  EyeIcon,
  FileTextIcon,
  GraduationCapIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
  TriangleAlertIcon,
  VideoIcon,
  XIcon,
  CheckIcon,
  CircleIcon,
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
import {
  isLessonEditorDirty,
  normalizeQuizForCompare,
  type LessonDirtySnapshot,
} from './lesson-dirty';

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
    learning_outcomes?: string[] | null;
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
  content_type?: 'video' | 'readable';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const movedNotice = searchParams.get('notice') === 'moved-to-builder';
  const dismissNotice = () => {
    setSearchParams(
      previous => {
        const next = new URLSearchParams(previous);
        next.delete('notice');
        return next;
      },
      {replace: true},
    );
  };
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
  const [pendingSwitch, setPendingSwitch] = useState<{
    lesson: Lesson;
    chapterId: number;
  } | null>(null);
  const lessonDirtyCheckRef = useRef<(() => boolean) | null>(null);

  const switchToLesson = (nextLesson: Lesson, nextChapterId: number) => {
    setSelectedLesson(nextLesson);
    setSelectedChapterId(nextChapterId);
    setMobileSurface('editor');
    setPendingSwitch(null);
  };

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
          // Default for a fresh empty lesson; the creator can toggle to
          // readable in the editor immediately after. Required by the API
          // (LessonsController::store validates content_type as required).
          content_type: 'video',
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
    const previousTitle = course?.chapters.find(
      c => c.id === chapterId,
    )?.title;
    setCourse(c => {
      if (!c) return c;
      return {
        ...c,
        chapters: c.chapters.map(ch =>
          ch.id === chapterId ? {...ch, title} : ch,
        ),
      };
    });
    try {
      await apiClient.put(`/api/v1/course-chapters/${chapterId}`, {title});
      toast.positive('Chapter title saved');
    } catch (e: any) {
      if (previousTitle !== undefined) {
        const revertedTitle = previousTitle;
        setCourse(c => {
          if (!c) return c;
          return {
            ...c,
            chapters: c.chapters.map(ch =>
              ch.id === chapterId ? {...ch, title: revertedTitle} : ch,
            ),
          };
        });
      }
      toast.danger(e.message ?? 'Unable to save chapter title');
    }
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

    const targetCount =
      course.chapters.find(c => c.id === targetChapterId)?.lessons.length ?? 0;
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
        position: targetCount,
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
              <div className="flex flex-col gap-3 p-3">
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
              <EyeIcon data-icon="inline-start" />
              <Trans message="Preview" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsIcon data-icon="inline-start" />
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
              <Trans message="Analytics" />
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
                <Trans message="Analytics" />
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>
          <div className="flex min-w-0 flex-col items-end gap-1">
            {!hasPublishedLesson && canSubmit && !publishing && (
              <p className="text-xs text-muted-foreground">
                <Trans message="Publish at least one lesson to submit for review." />
              </p>
            )}
            {!canSubmit && (
              <p className="text-xs text-muted-foreground">
                <Trans message="Edits will return this course to draft." />
              </p>
            )}
            <Tooltip.Root>
              <Tooltip.Trigger
                aria-label="Submit for review"
                render={
                  <span className="inline-flex">
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
                  </span>
                }
              >
                <span className="sr-only">
                  <Trans message="Submit requirements" />
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content>
                {!hasPublishedLesson ? (
                  <Trans message="Publish at least one lesson before submitting." />
                ) : !canSubmit ? (
                  <Trans message="This course is live or in review." />
                ) : (
                  <Trans message="Submit this course for review." />
                )}
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
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
            {movedNotice && (
              <div className="border-b px-3 py-3">
                <Alert.Root className="border-primary/20 bg-primary/5">
                  <Alert.Description className="flex flex-wrap items-center justify-between gap-2">
                    <Trans message="Course details live here in the course builder." />
                    <Button size="sm" variant="ghost" onClick={dismissNotice}>
                      <Trans message="Dismiss" />
                    </Button>
                  </Alert.Description>
                </Alert.Root>
              </div>
            )}
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
                            className="overflow-hidden rounded-card-xs border bg-background"
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
                                className="group flex size-8 shrink-0 items-center justify-center rounded-card-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                                aria-label="Delete chapter"
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
                                              if (lessonDirtyCheckRef.current?.()) {
                                                setPendingSwitch({
                                                  lesson,
                                                  chapterId: chapter.id,
                                                });
                                                return;
                                              }
                                              switchToLesson(lesson, chapter.id);
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
                key={selectedLesson.id}
                lesson={selectedLesson}
                chapterId={selectedChapterId}
                onSaved={load}
                onSelectLesson={setSelectedLesson}
                onBackToCurriculum={() => setMobileSurface('curriculum')}
                dirtyCheckRef={lessonDirtyCheckRef}
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
      <AlertDialog.Root
        open={pendingSwitch !== null}
        onOpenChange={open => {
          if (!open) setPendingSwitch(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Title>
                <Trans message="Discard unsaved changes?" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="Switching lessons will discard your unsaved edits to this lesson." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>
                <Trans message="Keep editing" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={() => {
                  if (pendingSwitch) {
                    switchToLesson(
                      pendingSwitch.lesson,
                      pendingSwitch.chapterId,
                    );
                  }
                }}
              >
                <Trans message="Discard" />
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
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
            ...chapter.lessons,
            {...lesson, chapter_id: targetChapterId},
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
              <Trans message="Choose a chapter for :name." values={{name: lesson.title}} />
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

function EditorContentSync({content}: {content: string}) {
  const editor = useCurrentTextEditor();
  const prevContentRef = useRef(content);
  useEffect(() => {
    if (editor && editor.isEditable && content !== prevContentRef.current) {
      const cur = editor.getHTML();
      const normCur = cur === '<p></p>' ? '' : cur;
      const normTarget = content === '<p></p>' ? '' : content;
      if (normCur !== normTarget) {
        editor.commands.setContent(content);
      }
      prevContentRef.current = content;
    }
  }, [content, editor]);
  return null;
}

function LessonEditor({
  lesson,
  chapterId,
  onSaved,
  onSelectLesson,
  onBackToCurriculum,
  dirtyCheckRef,
}: {
  lesson: Lesson;
  chapterId: number | null;
  onSaved: () => void;
  onSelectLesson: (l: Lesson) => void;
  onBackToCurriculum: () => void;
  dirtyCheckRef?: RefObject<(() => boolean) | null>;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [status, setStatus] = useState(lesson.status);
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? '');
  const [videoType, setVideoType] = useState<Lesson['video_type']>(lesson.video_type ?? null);
  const [videoFileEntryId, setVideoFileEntryId] = useState<number | null>(lesson.video_file_entry_id ?? null);
  const [content, setContent] = useState(lesson.content ?? '');
  const [contentType, setContentType] = useState<Lesson['content_type']>(lesson.content_type ?? 'video');
  const [activeTab, setActiveTab] = useState<'summary' | 'content' | 'attachments' | 'quiz'>('summary');
  const [saving, setSaving] = useState(false);
  const [resources, setResources] = useState<LessonResource[]>(
    lesson.resources ?? [],
  );
  // Quiz state
  const [quiz, setQuiz] = useState<{
    id?: number;
    require_pass_to_progress: boolean;
    passing_score: number;
    questions: Array<{
      id?: number;
      key: string;
      type: 'multiple_choice' | 'true_false';
      question_text: string;
      options?: string[];
      correct_answer: string;
    }>;
  } | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSaving, setQuizSaving] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [expandedQuestionKeys, setExpandedQuestionKeys] = useState<Set<string>>(new Set());
  const lessonSnapshotRef = useRef<LessonDirtySnapshot | null>(null);
  const quizSnapshotRef = useRef<string | null>(null);
  const quizAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setTitle(lesson.title);
    setStatus(lesson.status);
    setVideoUrl(lesson.video_url ?? '');
    setVideoType(lesson.video_type ?? null);
    setVideoFileEntryId(lesson.video_file_entry_id ?? null);
    setContent(lesson.content ?? '');
    setContentType(lesson.content_type ?? 'video');
    setResources(lesson.resources ?? []);
    // Load quiz for this lesson
    setQuiz(null);
    setExpandedQuestionKeys(new Set());
    setQuizLoading(true);
    setQuizError(null);
    const controller = new AbortController();
    quizAbortRef.current = controller;
    apiClient
      .get(`/api/v1/course-lessons/${lesson.id}/quiz`, {signal: controller.signal})
      .then((res) => {
        if (controller.signal.aborted) return;
        const data = res.data.data;
        setQuiz(
          data
            ? {
                ...data,
                questions: (data.questions ?? []).map((q: any) => ({
                  ...q,
                  key: crypto.randomUUID(),
                })),
              }
            : null,
        );
        quizSnapshotRef.current = normalizeQuizForCompare(data ?? null);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err.response?.status !== 404) {
          setQuizError(err.response?.data?.message ?? 'Failed to load quiz');
        }
        setQuiz(null);
        quizSnapshotRef.current = null;
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuizLoading(false);
      });
    lessonSnapshotRef.current = {
      title: lesson.title,
      status: lesson.status,
      videoUrl: lesson.video_url ?? '',
      videoType: lesson.video_type ?? null,
      videoFileEntryId: lesson.video_file_entry_id ?? null,
      content: lesson.content ?? '',
      contentType: lesson.content_type ?? 'video',
      resourceIds: (lesson.resources ?? []).map(r => r.id).sort((a, b) => a - b),
      quizJson: null,
    };
    return () => controller.abort();
  }, [lesson]);

  const hasUnsavedChanges = () => {
    const baseline = lessonSnapshotRef.current;
    if (baseline === null) return false;
    return isLessonEditorDirty(
      {
        title,
        status,
        videoUrl,
        videoType: videoType ?? null,
        videoFileEntryId,
        content,
        contentType: contentType ?? 'video',
        resourceIds: resources.map(r => r.id).sort((a, b) => a - b),
        quizJson: normalizeQuizForCompare(quiz),
      },
      {...baseline, quizJson: quizSnapshotRef.current},
    );
  };

  useEffect(() => {
    if (dirtyCheckRef) dirtyCheckRef.current = hasUnsavedChanges;
  });

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        title,
        content,
        status,
        content_type: contentType,
      };
      if (contentType === 'video') {
        if (videoUrl) {
          payload.video_type = 'external';
          payload.video_url = videoUrl;
          payload.video_file_entry_id = null;
        } else if (videoFileEntryId) {
          payload.video_type = 'upload';
          payload.video_url = null;
          payload.video_file_entry_id = videoFileEntryId;
        } else {
          payload.video_type = null;
          payload.video_url = null;
          payload.video_file_entry_id = null;
        }
      } else {
        payload.video_type = null;
        payload.video_url = null;
        payload.video_file_entry_id = null;
      }
      const res = await apiClient.put(`/api/v1/course-lessons/${lesson.id}`, payload);
      const updated = (res.data as any).data as Lesson;
      onSelectLesson(updated);
      toast.positive('Lesson saved');
      lessonSnapshotRef.current = {
        title,
        status,
        videoUrl,
        videoType: videoType ?? null,
        videoFileEntryId,
        content,
        contentType: contentType ?? 'video',
        resourceIds: resources.map(r => r.id).sort((a, b) => a - b),
        quizJson: null,
      };
      onSaved();
    } catch (e: any) {
      toast.danger(e.message ?? 'Unable to save');
    } finally {
      setSaving(false);
    }
  };

  const saveQuiz = async () => {
    if (!quiz) return;
    setQuizSaving(true);
    setQuizError(null);
    try {
      const payload = {
        require_pass_to_progress: quiz.require_pass_to_progress,
        passing_score: quiz.passing_score,
        questions: quiz.questions.map((q) => ({
          type: q.type,
          question_text: q.question_text,
          options: q.type === 'multiple_choice' ? q.options : undefined,
          correct_answer: q.correct_answer,
        })),
      };
      if (quiz.id) {
        await apiClient.put(`/api/v1/quizzes/${quiz.id}`, payload);
      } else {
        const res = await apiClient.post(`/api/v1/course-lessons/${lesson.id}/quiz`, payload);
        setQuiz((prev) => (prev ? { ...prev, id: res.data.data.id } : null));
      }
      quizSnapshotRef.current = normalizeQuizForCompare(quiz);
      toast.positive('Quiz saved');
    } catch (e: any) {
      const msg = e.response?.data?.message ?? e.message ?? 'Unable to save quiz';
      setQuizError(msg);
      toast.danger(msg);
    } finally {
      setQuizSaving(false);
    }
  };

  const addQuestion = () => {
    const key = crypto.randomUUID();
    setExpandedQuestionKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setQuiz((prev) =>
      prev
        ? {
            ...prev,
            questions: [
              ...prev.questions,
              {
                key,
                type: 'multiple_choice',
                question_text: '',
                options: ['', ''],
                correct_answer: '',
              },
            ],
          }
        : null,
    );
  };

  const removeQuestion = (index: number) => {
    const targetKey = quiz?.questions[index]?.key;
    if (targetKey) {
      setExpandedQuestionKeys(prev => {
        const next = new Set(prev);
        next.delete(targetKey);
        return next;
      });
    }
    setQuiz((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index),
          }
        : null,
    );
  };

  const setQuestionOpen = (key: string, isOpen: boolean) => {
    setExpandedQuestionKeys(prev => {
      const next = new Set(prev);
      if (isOpen) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const updateQuestion = (index: number, updates: Partial<NonNullable<typeof quiz>['questions'][0]>) => {
    setQuiz((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q, i) => (i === index ? { ...q, ...updates } : q)),
          }
        : null,
    );
  };

  const addOption = (questionIndex: number) => {
    setQuiz((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q, i) =>
              i === questionIndex && q.options
                ? { ...q, options: [...q.options, ''] }
                : q,
            ),
          }
        : null,
    );
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuiz((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q, i) =>
              i === questionIndex && q.options
                ? { ...q, options: q.options.filter((_, oi) => oi !== optionIndex) }
                : q,
            ),
          }
        : null,
    );
  };

  const toggleCorrectOption = (questionIndex: number, optionIndex: number) => {
    setQuiz((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q, i) =>
              i === questionIndex && q.options
                ? { ...q, correct_answer: q.options[optionIndex] }
                : q,
            ),
          }
        : null,
    );
  };

  const setCorrectAnswer = (questionIndex: number, value: string) => {
    setQuiz((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q, i) =>
              i === questionIndex ? { ...q, correct_answer: value } : q,
            ),
          }
        : null,
    );
  };

  const createQuiz = () => {
    setQuiz({
      require_pass_to_progress: false,
      passing_score: 70,
      questions: [],
    });
  };

  const [deleteQuizOpen, setDeleteQuizOpen] = useState(false);

  const deleteQuiz = async () => {
    if (!quiz) return;
    if (quiz.id) {
      try {
        await apiClient.delete(`/api/v1/quizzes/${quiz.id}`);
        toast.positive('Quiz deleted');
      } catch (e: any) {
        toast.danger(e.message ?? 'Unable to delete quiz');
        return;
      }
    }
    setQuiz(null);
    setDeleteQuizOpen(false);
  };

  const attachVideoEntry = async (entry: {id: number}) => {
    try {
      const res = await apiClient.put(`/api/v1/course-lessons/${lesson.id}`, {
        video_type: 'upload',
        video_file_entry_id: entry.id,
      });
      const updated = (res.data as any).data as Lesson;
      setVideoType('upload');
      setVideoFileEntryId(entry.id);
      setVideoUrl('');
      onSelectLesson(updated);
      toast.positive('Video uploaded');
    } catch {
      toast.danger('Unable to attach the uploaded video');
    }
  };

  const attachResourceEntry = async (entry: {id: number}) => {
    try {
      const res = await apiClient.post(
        `/api/v1/course-lessons/${lesson.id}/resources`,
        {file_entry_id: entry.id},
      );
      const newRes = (res.data as any).data as LessonResource;
      setResources(prev => [...prev, newRes]);
    } catch {
      toast.danger('Unable to attach the resource');
    }
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
          <Trans message="Chapter :id • Lesson editor" values={{id: chapterId}} />
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

      <Field.Root>
        <Field.Label>
          <Trans message="Lesson type" />
        </Field.Label>
        <Select.Root
          value={contentType}
          onValueChange={value => {
            setContentType(value as 'video' | 'readable');
          }}
        >
          <Select.Trigger className="w-full">
            <Select.Value>
              {(value: string | null) =>
                value === 'video' ? (
                  <Trans message="Video lesson" />
                ) : value === 'readable' ? (
                  <Trans message="Readable lesson" />
                ) : null}
            </Select.Value>
          </Select.Trigger>
          <Select.Content>
            <Select.Group>
              <Select.Item value="video">
                <Trans message="Video lesson" />
              </Select.Item>
              <Select.Item value="readable">
                <Trans message="Readable lesson" />
              </Select.Item>
            </Select.Group>
          </Select.Content>
        </Select.Root>
        <p className="text-xs text-muted-foreground">
          <Trans
            message={
              contentType === 'video'
                ? 'Readable content is preserved when switching types.'
                : 'Video summary is preserved when switching types.'
            }
          />
        </p>
      </Field.Root>

      {contentType === 'video' && (
        <Card.Root className="gap-0 overflow-hidden border py-0 ring-0">
          <Card.Header className="p-4">
            <div className="flex items-center gap-2">
              <VideoIcon className="size-4 text-muted-foreground" aria-hidden="true" />
              <Card.Title className="text-sm"><Trans message="Video" /></Card.Title>
            </div>
            <Card.Description><Trans message="Upload a video or paste a YouTube/Vimeo URL." /></Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col gap-4 p-4 pt-0">
            <SharedFileUploader
              uploadType="courseVideos"
              onUploaded={attachVideoEntry}
              accept="video/*"
              maxFiles={1}
              multiple={false}
              bare
              title={<Trans message="Upload a video" />}
              description={<Trans message=".mp4, .mov, .mpeg, or .webm" />}
              hint={<Trans message="Max 2GB per video" />}
            />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs text-muted-foreground bg-card px-2"><Trans message="or" /></div>
            </div>
            <Field.Root>
              <Field.Label><Trans message="Video URL" /></Field.Label>
              <Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
              <Field.Description><Trans message="Paste a YouTube or Vimeo URL" /></Field.Description>
            </Field.Root>
            {(videoUrl || videoFileEntryId) && (
              <div className="rounded-card border bg-muted/20 p-3 text-xs">
                {videoUrl ? (
                  <span className="block truncate">
                    <Trans message="Current: :name" values={{name: videoUrl}} /> —{' '}
                    <a href={videoUrl} target="_blank" className="underline"><Trans message="View" /></a>
                  </span>
                ) : (
                  <Trans message="Uploaded video attached" />
                )}
              </div>
            )}
          </Card.Content>
        </Card.Root>
      )}

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} defaultValue={contentType === 'video' ? 'summary' : 'content'} className="w-full">
        <Tabs.List variant="line" className="w-full">
          {contentType === 'video' ? (
            <Tabs.Tab value="summary">
              <Trans message="Summary" />
            </Tabs.Tab>
          ) : (
            <Tabs.Tab value="content">
              <Trans message="Content" />
            </Tabs.Tab>
          )}
          <Tabs.Tab value="attachments">
            <Trans message="Attachments" />
          </Tabs.Tab>
          <Tabs.Tab value="quiz">
            <Trans message="Quiz" />
          </Tabs.Tab>
        </Tabs.List>

        {contentType === 'video' && (
          <Tabs.Panel value="summary">
            <Field.Root>
              <Field.Label>
                <Trans message="Summary" />
              </Field.Label>
              <TipTapEditorProvider
                key={lesson.id}
                extensions={articleEditorTipTapExtensions}
                initialContent={content}
                onChange={setContent}
              >
                <EditorContentSync content={content} />
                <div className="overflow-hidden rounded-card-xs border">
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
          </Tabs.Panel>
        )}

        {contentType === 'readable' && (
          <Tabs.Panel value="content">
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
                <EditorContentSync content={content} />
                <div className="overflow-hidden rounded-card-xs border">
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
          </Tabs.Panel>
        )}

        <Tabs.Panel value="attachments">
          <Field.Root>
            <Field.Label>
              <Trans message="File attachments" />
            </Field.Label>
            <Card className="overflow-hidden border ring-0">
              <Card.Header className="pb-3">
                <Card.Title className="flex items-center gap-2 text-sm">
                  <FileTextIcon className="size-4" />
                  <Trans message="Lesson files" />
                </Card.Title>
                <Card.Description>
                  <Trans message="PDF, DOC, TXT, images up to 100MB" />
                </Card.Description>
              </Card.Header>
              <Card.Content className="flex flex-col gap-4 p-4 pt-0">
                <SharedFileUploader
                  uploadType="courseResources"
                  onUploaded={attachResourceEntry}
                  accept=".pdf,.doc,.docx,.txt,.csv,.png,.jpg,.jpeg,.webp,.zip"
                  bare
                  title={<Trans message="Drop files here or click to upload" />}
                  description={<Trans message="PDF, DOC, images up to 100MB" />}
                />
                {resources.length > 0 ? (
                  <div className="flex flex-col gap-2 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Trans message="Attached files (:count)" values={{count: resources.length}} />
                    </p>
                    <div className="flex flex-col gap-2">
                      {resources.map(r => (
                        <div key={r.id} className="flex items-center gap-3 rounded-card border bg-card/50 p-3 transition-colors hover:bg-muted/30">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-card-sm bg-primary/10 text-primary">
                            <FileTextIcon className="size-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{r.display_name}</p>
                            <p className="truncate text-xs text-muted-foreground">{r.file?.name ?? 'file'}</p>
                          </div>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={async () => {
                              await apiClient.delete(`/api/v1/course-lesson-resources/${r.id}`);
                              setResources(prev => prev.filter(x => x.id !== r.id));
                            }}
                            aria-label="Remove file"
                          >
                            <XIcon className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="py-2 text-center text-sm text-muted-foreground"><Trans message="No files attached yet" /></p>
                )}
              </Card.Content>
            </Card>
          </Field.Root>
        </Tabs.Panel>

        <Tabs.Panel value="quiz">
          <div className="flex flex-col gap-4">
            {quizLoading && (
              <div className="flex items-center justify-center py-8">
                <Skeleton className="h-4 w-48" />
              </div>
            )}
            {quizError && !quizLoading && (
              <Alert variant="destructive" fillStyle="subtleFill">
                <TriangleAlertIcon />
                <Alert.Title><Trans message="Error loading quiz" /></Alert.Title>
                <Alert.Description>{quizError}</Alert.Description>
              </Alert>
            )}
            {!quizLoading && !quiz && !quizError && (
              <Empty.Root>
                <Empty.Header>
                  <Empty.Media variant="icon">
                    <GraduationCapIcon />
                  </Empty.Media>
                  <Empty.Title>
                    <Trans message="No quiz for this lesson" />
                  </Empty.Title>
                  <Empty.Description>
                    <Trans message="Add multiple choice or true/false questions to check understanding before students progress." />
                  </Empty.Description>
                </Empty.Header>
                <Empty.Content>
                  <Button onClick={createQuiz}>
                    <PlusIcon data-icon="inline-start" />
                    <Trans message="Create quiz" />
                  </Button>
                </Empty.Content>
              </Empty.Root>
            )}
            {quiz && !quizLoading && (
              <form onSubmit={(e) => { e.preventDefault(); saveQuiz(); }} className="flex flex-col gap-4">
                <Card className="gap-0 border py-0 ring-0">
                  <Card.Header className="p-4">
                    <Card.Title className="text-sm">
                      <Trans message="Quiz Settings" />
                    </Card.Title>
                  </Card.Header>
                  <Card.Content className="flex flex-col gap-4 p-4 pt-0">
                    <Field.Root>
                      <Field.Label>
                        <Trans message="Require passing to progress" />
                      </Field.Label>
                      <Switch
                        checked={quiz.require_pass_to_progress}
                        onCheckedChange={(v) => setQuiz({ ...quiz, require_pass_to_progress: v })}
                      />
                      <Field.Description>
                        <Trans message="Students must pass this quiz to continue to the next lesson." />
                      </Field.Description>
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>
                        <Trans message="Passing score (%)" />
                      </Field.Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={quiz.passing_score}
                        onChange={(e) =>
                          setQuiz({ ...quiz, passing_score: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })
                        }
                        className="w-24"
                      />
                      <Field.Description>
                        <Trans message="Minimum percentage required to pass." />
                      </Field.Description>
                    </Field.Root>
                  </Card.Content>
                </Card>

                <Card className="gap-0 border py-0 ring-0">
                  <Card.Header className="flex items-center justify-between p-4">
                    <Card.Title className="text-sm">
                      <Trans message="Questions" />
                    </Card.Title>
                    <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                      <PlusIcon data-icon="inline-start" />
                      <Trans message="Add question" />
                    </Button>
                  </Card.Header>
                  <Card.Content className="flex flex-col gap-4 p-4 pt-0">
                    {quiz.questions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        <Trans message="No questions yet. Click 'Add question' to start." />
                      </p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {quiz.questions.map((q, qi) => {
                          const questionKey = q.key ?? `question-${qi}`;
                          const questionPreview = q.question_text.trim();
                          const questionAnswered = q.correct_answer !== '';
                          return (
                            <Collapsible
                              key={questionKey}
                              open={expandedQuestionKeys.has(questionKey)}
                              onOpenChange={isOpen => setQuestionOpen(questionKey, isOpen)}
                              className="overflow-hidden rounded-card-xs border bg-background"
                            >
                              <div className="flex items-center gap-2 bg-muted/30 p-2">
                                <CollapsibleTrigger
                                  aria-label={`Toggle question ${qi + 1}`}
                                  className="group flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 rounded-card-sm p-1 text-start hover:bg-muted/50"
                                >
                                  <span className="shrink-0 text-sm font-medium">
                                    <Trans message="Question" /> {qi + 1}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                                    {questionPreview ? (
                                      questionPreview
                                    ) : (
                                      <Trans message="Untitled question" />
                                    )}
                                  </span>
                                  <Badge variant="outline">
                                    {q.type === 'multiple_choice' ? (
                                      <Trans message="Multiple choice" />
                                    ) : (
                                      <Trans message="True / False" />
                                    )}
                                  </Badge>
                                  {questionAnswered ? (
                                    <CheckIcon className="size-4 shrink-0 text-positive" />
                                  ) : null}
                                  <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
                                </CollapsibleTrigger>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="shrink-0"
                                  onClick={() => removeQuestion(qi)}
                                  aria-label="Remove question"
                                >
                                  <Trash2Icon className="size-4" />
                                </Button>
                              </div>
                              <CollapsibleContent>
                                <div className="flex flex-col gap-4 p-4">
                                  <Field.Root>
                                    <Field.Label>
                                      <Trans message="Question type" />
                                    </Field.Label>
                                    <Select.Root
                                      value={q.type}
                                      onValueChange={(v) => {
                                        const type = v as 'multiple_choice' | 'true_false';
                                        updateQuestion(qi, {
                                          type,
                                          options: type === 'multiple_choice' ? (q.options ?? ['', '']) : undefined,
                                          correct_answer: type === 'true_false' ? 'true' : '',
                                        });
                                      }}
                                    >
                                      <Select.Trigger className="w-full">
                                        <Select.Value>
                                          {(value: string | null) =>
                                            value === 'multiple_choice' ? (
                                              <Trans message="Multiple choice" />
                                            ) : value === 'true_false' ? (
                                              <Trans message="True / False" />
                                            ) : null}
                                        </Select.Value>
                                      </Select.Trigger>
                                      <Select.Content>
                                        <Select.Item value="multiple_choice">
                                          <Trans message="Multiple choice" />
                                        </Select.Item>
                                        <Select.Item value="true_false">
                                          <Trans message="True / False" />
                                        </Select.Item>
                                      </Select.Content>
                                    </Select.Root>
                                  </Field.Root>

                                  <Field.Root>
                                    <Field.Label>
                                      <Trans message="Question text" />
                                    </Field.Label>
                                    <Input
                                      value={q.question_text}
                                      onChange={(e) => updateQuestion(qi, { question_text: e.target.value })}
                                      placeholder="Enter your question"
                                    />
                                  </Field.Root>

                            {q.type === 'multiple_choice' && (
                              <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">
                                    <Trans message="Options" />
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addOption(qi)}
                                  >
                                    <PlusIcon data-icon="inline-start" />
                                    <Trans message="Add option" />
                                  </Button>
                                </div>
                                {q.options?.map((opt, oi) => {
                                  const firstCorrectIndex = (q.options ?? []).findIndex(o => o !== '' && o === q.correct_answer);
                                  const isCorrect = oi === firstCorrectIndex;
                                  return (
                                    <div key={oi} className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant={isCorrect ? 'default' : 'outline'}
                                        size="icon-sm"
                                        onClick={() => toggleCorrectOption(qi, oi)}
                                        aria-label={isCorrect ? 'Correct answer' : 'Mark as correct'}
                                      >
                                        {isCorrect ? <CheckIcon className="size-4" /> : <CircleIcon className="size-4" />}
                                      </Button>
                                      <Input
                                        value={opt}
                                        onChange={(e) => {
                                          const newOptions = [...(q.options ?? [])];
                                          newOptions[oi] = e.target.value;
                                          updateQuestion(qi, { options: newOptions });
                                        }}
                                        placeholder="Option text"
                                        className="flex-1"
                                      />
                                      {q.options && q.options.length > 2 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={() => removeOption(qi, oi)}
                                          aria-label="Remove option"
                                        >
                                          <Trash2Icon className="size-4" />
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {q.type === 'true_false' && (
                              <Field.Root>
                                <Field.Label>
                                  <Trans message="Correct answer" />
                                </Field.Label>
                                <div className="flex items-center gap-4">
                                  <Button
                                    type="button"
                                    variant={q.correct_answer === 'true' ? 'default' : 'outline'}
                                    onClick={() => setCorrectAnswer(qi, 'true')}
                                    className="w-24"
                                  >
                                    <Trans message="True" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={q.correct_answer === 'false' ? 'default' : 'outline'}
                                    onClick={() => setCorrectAnswer(qi, 'false')}
                                    className="w-24"
                                  >
                                    <Trans message="False" />
                                  </Button>
                                </div>
                              </Field.Root>
                            )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    )}
                  </Card.Content>
                </Card>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setDeleteQuizOpen(true)}>
                    <Trans message="Delete quiz" />
                  </Button>
                  <Button type="submit" disabled={quizSaving}>
                    {quizSaving && <Spinner data-icon="inline-start" />}
                    <Trans message="Save quiz" />
                  </Button>
                </div>
              </form>
            )}
            <AlertDialog.Root
              open={deleteQuizOpen}
              onOpenChange={setDeleteQuizOpen}
            >
              <AlertDialog.Portal>
                <AlertDialog.Backdrop />
                <AlertDialog.Content size="sm">
                  <AlertDialog.Header>
                    <AlertDialog.Media className="bg-destructive/10 text-destructive">
                      <Trash2Icon />
                    </AlertDialog.Media>
                    <AlertDialog.Title>
                      <Trans message="Delete quiz?" />
                    </AlertDialog.Title>
                    <AlertDialog.Description>
                      <Trans message="This quiz and all its questions will be permanently deleted." />
                    </AlertDialog.Description>
                  </AlertDialog.Header>
                  <AlertDialog.Footer>
                    <AlertDialog.Cancel disabled={quizSaving}>
                      <Trans message="Cancel" />
                    </AlertDialog.Cancel>
                    <AlertDialog.Action
                      color="danger"
                      onClick={deleteQuiz}
                      disabled={quizSaving}
                    >
                      <Trans message={quizSaving ? 'Deleting...' : 'Delete'} />
                    </AlertDialog.Action>
                  </AlertDialog.Footer>
                </AlertDialog.Content>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          </div>
        </Tabs.Panel>
      </Tabs.Root>


      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={status === 'published'}
            onCheckedChange={v => setStatus(v ? 'published' : 'draft')}
          />
          <Trans message="Published" />
        </label>
        <Button onClick={() => void save()} disabled={saving}>
          {saving && <Spinner data-icon="inline-start" />}
          <Trans message="Save changes" />
        </Button>
      </div>
    </div>
  );
}

function SortableOutcomeItem({
  id,
  items,
  disabled,
  onSortEnd,
  children,
}: {
  id: string;
  items: string[];
  disabled: boolean;
  onSortEnd: (oldIndex: number, newIndex: number) => void;
  children: (dragHandleRef: React.RefObject<HTMLButtonElement | null>) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const {sortableProps, dragHandleRef} = useSortable({
    item: id,
    items,
    type: 'course-builder-outcomes',
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

function OutcomesChipList({
  outcomes,
  onChange,
}: {
  outcomes: {id: string; text: string}[];
  onChange: (outcomes: {id: string; text: string}[]) => void;
}) {
  const [newOutcome, setNewOutcome] = useState('');
  const MAX_OUTCOMES = 8;

  const addOutcome = () => {
    if (!newOutcome.trim() || outcomes.length >= MAX_OUTCOMES) return;
    const newItem = { id: crypto.randomUUID(), text: newOutcome.trim() };
    onChange([...outcomes, newItem]);
    setNewOutcome('');
  };

  const removeOutcome = (id: string) => {
    onChange(outcomes.filter(item => item.id !== id));
  };

  const handleReorder = (oldIndex: number, newIndex: number) => {
    const newOutcomes = [...outcomes];
    const [removed] = newOutcomes.splice(oldIndex, 1);
    newOutcomes.splice(newIndex, 0, removed);
    onChange(newOutcomes);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          value={newOutcome}
          onChange={e => setNewOutcome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addOutcome()}
          placeholder="e.g. Build and launch your first course"
          disabled={outcomes.length >= MAX_OUTCOMES}
        />
        <Button
          type="button"
          onClick={addOutcome}
          disabled={!newOutcome.trim() || outcomes.length >= MAX_OUTCOMES}
        >
          <Trans message="Add" />
        </Button>
        {outcomes.length >= MAX_OUTCOMES && (
          <span className="text-xs text-muted-foreground self-center">
            <Trans message="Maximum of 8 outcomes reached" />
          </span>
        )}
      </div>
      {outcomes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {outcomes.map(item => (
            <SortableOutcomeItem
              key={item.id}
              id={item.id}
              items={outcomes.map(o => o.id)}
              disabled={false}
              onSortEnd={handleReorder}
            >
              {dragHandleRef => (
                <div className="flex items-center gap-1.5 rounded-card-sm border bg-background px-2.5 py-1 text-sm">
                  <button
                    ref={dragHandleRef}
                    type="button"
                    aria-label="Reorder outcome"
                    className="shrink-0 cursor-grab text-muted-foreground hover:text-foreground"
                  >
                    <GripVerticalIcon className="size-3.5" />
                  </button>
                  <span>{item.text}</span>
                  <button
                    type="button"
                    onClick={() => removeOutcome(item.id)}
                    aria-label="Remove outcome"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              )}
            </SortableOutcomeItem>
          ))}
        </div>
      )}
    </div>
  );
}

type CourseSettingsContentProps = {
  inputId: string;
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  learningOutcomes: {id: string; text: string}[];
  setLearningOutcomes: (value: {id: string; text: string}[]) => void;
  coverUrl: string;
  setCoverUrl: (value: string) => void;
  setCoverFileId: (value: number | null) => void;
  price: string;
  setPrice: (value: string) => void;
  legacyCurrency: string;
  convertToEtb: boolean;
  setConvertToEtb: (value: boolean) => void;
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
  learningOutcomes,
  setLearningOutcomes,
  coverUrl,
  setCoverUrl,
  setCoverFileId,
  price,
  setPrice,
  legacyCurrency,
  convertToEtb,
  setConvertToEtb,
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
        <CourseSettingsDescriptionEditor
          value={description}
          onChange={setDescription}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>
          <Trans message="What you'll learn" />
        </Field.Label>
        <Field.Description>
          <Trans message="Add up to 8 outcome bullets that students will achieve." />
        </Field.Description>
        <OutcomesChipList
          outcomes={learningOutcomes}
          onChange={setLearningOutcomes}
        />
      </Field.Root>

      <Field.Root>
        <Field.Label>
          <Trans message="Cover Image" />
        </Field.Label>
        <CroppedCover
          value={coverUrl}
          onChange={(url, entry) => {
            setCoverUrl(url);
            setCoverFileId(entry?.id ?? null);
          }}
          uploadType="linkImages"
          aspect={16 / 9}
        />
        <Field.Description>
          <Trans message="Recommended size: 1200x514px • Max size: 5MB" />
        </Field.Description>
      </Field.Root>

      <Field.Root>
        <Field.Label htmlFor={`${inputId}-price`}>
          <Trans message="Price (ETB)" />
        </Field.Label>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InputGroupText>ETB</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id={`${inputId}-price`}
            value={price}
            onChange={e => setPrice(e.target.value)}
            type="number"
            min="0"
            step="0.01"
          />
        </InputGroup>
        {legacyCurrency.toLowerCase() !== 'etb' && (
          <label className="mt-2 flex items-start gap-3 rounded-card-sm border border-border bg-muted/30 p-3 text-sm">
            <Checkbox
              checked={convertToEtb}
              onCheckedChange={value => setConvertToEtb(value === true)}
            />
            <span>
              <span className="block font-medium">
                <Trans message="Convert this product price to ETB" />
              </span>
              <span className="mt-0.5 block text-[13px] text-muted-foreground">
                <Trans message="Set the correct Ethiopian birr amount above. Existing sales remain in their original currency." />
              </span>
            </span>
          </label>
        )}
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

function CourseSettingsDescriptionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TipTapEditorProvider
      extensions={articleEditorTipTapExtensions}
      initialContent={value}
      onChange={onChange}
    >
      <div className="overflow-hidden rounded-card-sm border border-border">
        <div className="no-scrollbar flex shrink-0 items-center gap-0.5 overflow-x-auto border-b px-1.5 py-1 text-muted-foreground">
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
        <TiptapEditorContent className="prose prose-sm min-h-[180px] max-w-none px-3 py-2.5 dark:prose-invert" />
      </div>
    </TipTapEditorProvider>
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
  const [learningOutcomes, setLearningOutcomes] = useState<{id: string; text: string}[]>(
    (course.product.learning_outcomes ?? []).map(text => ({
      id: crypto.randomUUID(),
      text,
    })),
  );
  const [discardOpen, setDiscardOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [convertToEtb, setConvertToEtb] = useState(false);

  useEffect(() => {
    setTitle(course.product.title);
    setDescription(course.product.description ?? '');
    setCoverUrl(course.product.cover?.url ?? '');
    setCoverFileId(course.product.cover?.id ?? null);
    setRequireSeq(course.require_sequential_completion);
    setBiolinkIds(course.product.biolink_ids ?? []);
    setPrice((course.product.price_cents / 100).toFixed(2));
    setConvertToEtb(false);
    setLearningOutcomes((course.product.learning_outcomes ?? []).map(text => ({
      id: crypto.randomUUID(),
      text,
    })));
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
    setConvertToEtb(false);
    setLearningOutcomes((course.product.learning_outcomes ?? []).map(text => ({
      id: crypto.randomUUID(),
      text,
    })));
  };

  const hasPlacementChanges =
    biolinkIds.length !== (course.product.biolink_ids ?? []).length ||
    biolinkIds.some(id => !(course.product.biolink_ids ?? []).includes(id));
  const savedOutcomes = course.product.learning_outcomes ?? [];
  const hasOutcomeChanges =
    learningOutcomes.length !== savedOutcomes.length ||
    learningOutcomes.some((item, index) => item.text !== savedOutcomes[index]);
  const isDirty =
    title !== course.product.title ||
    description !== (course.product.description ?? '') ||
    coverFileId !== (course.product.cover?.id ?? null) ||
    price !== (course.product.price_cents / 100).toFixed(2) ||
    requireSeq !== course.require_sequential_completion ||
    hasPlacementChanges ||
    hasOutcomeChanges;

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
    if (course.product.currency.toLowerCase() !== 'etb' && !convertToEtb) {
      toast.danger(
        'Enter the correct ETB price and confirm the currency conversion before saving.',
      );
      return;
    }

    const cents = Math.round(Number(price || '0') * 100);
    setSaving(true);
    try {
      await apiClient.put(`/api/v1/courses/${course.id}`, {
        title: title.trim() || course.product.title,
        description: description.trim() || null,
        learning_outcomes: learningOutcomes.map(item => item.text),
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
    learningOutcomes,
    setLearningOutcomes,
    coverUrl,
    setCoverUrl,
    setCoverFileId,
    price,
    setPrice,
    legacyCurrency: course.product.currency,
    convertToEtb,
    setConvertToEtb,
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
              <Trans message="Delete :name?" values={{name: itemName}} />
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
