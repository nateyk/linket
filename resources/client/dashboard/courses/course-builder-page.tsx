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
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Switch} from '@shadcn/forms/switch/switch';
import {FileDropzone} from '@common/ui/file-dropzone';
import {Trans} from '@ui/i18n/trans';
import {useSortable} from '@ui/interactions/dnd/sortable/use-sortable';
import {toast} from '@ui/toast/toast';
import {cn} from '@ui/utils/cn';
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
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reordering, setReordering] = useState<string>();

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const productRes = await fetch(`/api/v1/digital-products/${productId}`, {
        credentials: 'same-origin',
        headers: {Accept: 'application/json'},
      });
      if (!productRes.ok) throw new Error('Unable to load product');
      const productData = (await productRes.json()).data;
      const courseId = productData.course?.id;
      if (!courseId)
        throw new Error('Course not found — this product is not a course');
      const res = await fetch(`/api/v1/courses/${courseId}`, {
        credentials: 'same-origin',
        headers: {Accept: 'application/json'},
      });
      if (!res.ok) throw new Error('Unable to load course');
      const payload = (await res.json()).data as Course;
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
    const title = `Chapter ${course.chapters.length + 1}`;
    await apiClient.post(`/api/v1/courses/${course.id}/chapters`, {title});
    await load();
    toast.positive('Chapter added');
  };

  const addLesson = async (chapterId: number) => {
    const res = await apiClient.post(
      `/api/v1/course-chapters/${chapterId}/lessons`,
      {
        title: `Lesson ${Date.now().toString().slice(-3)}`,
      },
    );
    await load();
    const lesson = (res.data as any).data as Lesson;
    setSelectedLesson(lesson);
    setSelectedChapterId(chapterId);
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

  const deleteChapter = async (chapterId: number) => {
    if (!confirm('Delete this chapter and all its lessons?')) return;
    await apiClient.delete(`/api/v1/course-chapters/${chapterId}`);
    await load();
  };

  const deleteLesson = async (lessonId: number) => {
    if (!confirm('Delete this lesson?')) return;
    await apiClient.delete(`/api/v1/course-lessons/${lessonId}`);
    await load();
    if (selectedLesson?.id === lessonId) setSelectedLesson(null);
  };

  const toggleLessonStatus = async (lesson: Lesson) => {
    const newStatus = lesson.status === 'published' ? 'draft' : 'published';
    await apiClient.put(`/api/v1/course-lessons/${lesson.id}`, {
      status: newStatus,
    });
    await load();
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

  const publish = async () => {
    if (!course) return;
    setPublishing(true);
    try {
      await apiClient.post(`/api/v1/courses/${course.id}/publish`);
      toast.positive('Course published');
      await load();
    } catch (e: any) {
      toast.danger(e.message ?? 'Unable to publish');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionContent className="flex flex-1 gap-4 p-6">
          <div className="w-72 shrink-0 space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-9 w-1/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
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

  const isPublished = !!course.published_at;

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <GraduationCapIcon className="size-5" />
          <Trans message="Course Builder" />
          {isPublished && (
            <Badge variant="positive" className="ml-2">
              <Trans message="Published" />
            </Badge>
          )}
        </DashboardLayout.SectionTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/ @${course.product.title}`, '_blank')}
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
          <Button
            size="sm"
            onClick={() => void publish()}
            disabled={publishing}
          >
            <Trans message={isPublished ? 'Update' : 'Publish'} />
          </Button>
        </div>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="flex min-h-0 flex-1 flex-col gap-0 lg:flex-row">
          {/* Curriculum */}
          <div className="flex max-h-[50vh] w-full min-w-0 flex-col overflow-hidden border-b bg-card lg:max-h-none lg:w-[36%] lg:border-r lg:border-b-0">
            <div className="flex items-center justify-between gap-2 border-b p-3">
              <h2 className="text-sm font-semibold">
                <Trans message="Curriculum" />
              </h2>
              <Button
                size="xs"
                variant="outline"
                onClick={() => void addChapter()}
              >
                <PlusIcon />
                <Trans message="New chapter" />
              </Button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
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
                course.chapters.map(chapter => (
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
                        className="rounded-xl border bg-background"
                      >
                        <div className="flex items-center gap-2 border-b bg-muted/20 p-2">
                          <button
                            ref={dragHandleRef}
                            type="button"
                            aria-label="Reorder chapter"
                            disabled={!!reordering}
                            className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <GripVerticalIcon className="size-4" />
                          </button>
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
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => void deleteChapter(chapter.id)}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                        <CollapsibleTrigger className="flex w-full items-center justify-center border-t p-1 text-muted-foreground hover:bg-muted/20">
                          <ChevronDownIcon className="size-4 transition-transform data-[state=open]:rotate-180" />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-1 p-2">
                            {chapter.lessons.length === 0 ? (
                              <p className="py-3 text-center text-xs text-muted-foreground">
                                <Trans message="This chapter has no lessons yet." />
                              </p>
                            ) : (
                              chapter.lessons.map(lesson => (
                                <SortableCurriculumItem
                                  key={lesson.id}
                                  id={`course-builder-lesson-${lesson.id}`}
                                  items={chapter.lessons.map(
                                    item => `course-builder-lesson-${item.id}`,
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
                                      <button
                                        ref={dragHandleRef}
                                        type="button"
                                        aria-label="Reorder lesson"
                                        disabled={!!reordering}
                                        className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <GripVerticalIcon className="size-3.5" />
                                      </button>
                                      <VideoIcon className="size-3.5 text-muted-foreground" />
                                      <button
                                        className="flex-1 truncate text-left font-medium"
                                        onClick={() => {
                                          setSelectedLesson(lesson);
                                          setSelectedChapterId(chapter.id);
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
                                        className="h-5 px-1.5 text-[10px]"
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
                                              size="icon-xs"
                                              variant="ghost"
                                            >
                                              <MoreHorizontalIcon className="size-4" />
                                            </Button>
                                          }
                                        />
                                        <Dropdown.Content align="end">
                                          <Dropdown.Item
                                            onClick={() =>
                                              void toggleLessonStatus(lesson)
                                            }
                                          >
                                            <Trans
                                              message={
                                                lesson.status === 'published'
                                                  ? 'Unpublish'
                                                  : 'Publish'
                                              }
                                            />
                                          </Dropdown.Item>
                                          <Dropdown.Item
                                            onClick={async () => {
                                              await apiClient.post(
                                                `/api/v1/course-lessons/${lesson.id}/duplicate`,
                                              );
                                              await load();
                                            }}
                                          >
                                            <CopyIcon />
                                            <Trans message="Duplicate" />
                                          </Dropdown.Item>
                                          <Dropdown.Item
                                            variant="destructive"
                                            onClick={() =>
                                              void deleteLesson(lesson.id)
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
                              size="xs"
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
          </div>

          {/* Editor */}
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-muted/10 p-4">
            {selectedLesson ? (
              <LessonEditor
                lesson={selectedLesson}
                chapterId={selectedChapterId}
                onSaved={load}
                onSelectLesson={setSelectedLesson}
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
    </DashboardLayout.MainSection>
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
}: {
  lesson: Lesson;
  chapterId: number | null;
  onSaved: () => void;
  onSelectLesson: (l: Lesson) => void;
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
  const [title, setTitle] = useState(course.product.title);
  const [coverUrl, setCoverUrl] = useState(course.product.cover?.url ?? '');
  const [coverFileId, setCoverFileId] = useState<number | null>(
    course.product.cover?.id ?? null,
  );
  const [requireSeq, setRequireSeq] = useState(
    course.require_sequential_completion,
  );
  const [price, setPrice] = useState(
    (course.product.price_cents / 100).toFixed(2),
  );

  useEffect(() => {
    setTitle(course.product.title);
    setCoverUrl(course.product.cover?.url ?? '');
    setCoverFileId(course.product.cover?.id ?? null);
    setRequireSeq(course.require_sequential_completion);
    setPrice((course.product.price_cents / 100).toFixed(2));
  }, [course]);

  const save = async () => {
    await apiClient.put(`/api/v1/courses/${course.id}`, {
      require_sequential_completion: requireSeq,
    });
    const cents = Math.round(Number(price || '0') * 100);
    await apiClient.put(`/api/v1/digital-products/${course.product.id}`, {
      title: title.trim() || course.product.title,
      price_cents: Number.isFinite(cents) ? cents : course.product.price_cents,
      cover_file_entry_id: coverFileId,
      type: 'course',
    });
    toast.positive('Settings saved');
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
          <Dialog.Header className="border-b px-6 pt-6 pb-4">
            <Dialog.Title>
              <Trans message="Course Settings" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Manage your course cover image and other settings" />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body className="mx-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <Field.Root>
              <Field.Label htmlFor="course-name">
                <Trans message="Course Name" />
              </Field.Label>
              <div className="relative">
                <Input
                  id="course-name"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Enter a course name"
                  maxLength={160}
                  className="pr-18"
                />
              </div>
            </Field.Root>

            <Field.Root>
              <Field.Label>
                <Trans message="Cover Image" />
              </Field.Label>
              <div className="w-full space-y-3">
                {coverUrl && (
                  <div className="overflow-hidden rounded-xl border">
                    <img
                      src={coverUrl}
                      alt="Cover preview"
                      className="aspect-[1200/514] w-full object-cover"
                    />
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
              <Field.Label htmlFor="require-lesson-completion">
                <Trans message="Learning Settings" />
              </Field.Label>
              <div className="flex items-center justify-between gap-6 rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    <Trans message="Require students to complete lessons in order" />
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <Trans message="Students must complete lessons before moving to the next one" />
                  </p>
                </div>
                <Switch
                  id="require-lesson-completion"
                  checked={requireSeq}
                  onCheckedChange={setRequireSeq}
                />
              </div>
            </Field.Root>

            <Collapsible className="overflow-hidden rounded-lg border">
              <CollapsibleTrigger className="group flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40">
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">
                    <Trans message="Instructor" />
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    ID {course.instructor_user_id}
                  </span>
                </div>
                <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-3 text-sm text-muted-foreground">
                  <Trans message="Course instructor details are managed via your workspace profile." />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Dialog.Body>
          <Dialog.Footer className="mx-0 mb-0 border-t px-6 py-4">
            <Dialog.CloseButton>
              <Trans message="Cancel" />
            </Dialog.CloseButton>
            <Button onClick={() => void save()}>
              <Trans message="Save" />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
          <ImageCrop aspect={1200 / 514} file={pendingFile} onCrop={handleCrop}>
            <Dialog.Portal>
              <Dialog.Backdrop />
              <Dialog.Content className="sm:max-w-xl">
                <Dialog.Header>
                  <Dialog.Title>
                    <Trans message="Crop cover image" />
                  </Dialog.Title>
                  <Dialog.Description>
                    <Trans message="Adjust the preferred region, then apply." />
                  </Dialog.Description>
                </Dialog.Header>
                <Dialog.Body className="space-y-4">
                  <ImageCropContent className="max-h-[60vh] min-h-[320px] sm:max-h-[520px] sm:min-h-[460px]" />
                </Dialog.Body>
                <Dialog.Footer className="flex-row items-center justify-between gap-2">
                  <ImageCropReset asChild>
                    <Button type="button" variant="ghost" size="sm">
                      <Trans message="Reset" />
                    </Button>
                  </ImageCropReset>
                  <div className="flex gap-2">
                    <Dialog.CloseButton variant="outline" size="sm">
                      <Trans message="Cancel" />
                    </Dialog.CloseButton>
                    <ImageCropApply asChild>
                      <Button type="button" size="sm">
                        <Trans message="Apply crop" />
                      </Button>
                    </ImageCropApply>
                  </div>
                </Dialog.Footer>
              </Dialog.Content>
            </Dialog.Portal>
          </ImageCrop>
        </Dialog.Root>
      )}
    </>
  );
}
