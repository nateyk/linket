import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {CheckIcon, CircleIcon, ClockIcon, LockIcon, PlayIcon} from 'lucide-react';
import {Link} from 'react-router';

export type CurriculumLesson = {
  id: number;
  title: string;
  status: string;
  locked?: boolean;
  duration_seconds?: number | null;
};

export type CurriculumChapter = {
  id: number;
  title: string;
  lessons: CurriculumLesson[];
};

function formatDuration(seconds?: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function shouldShowChapterHeader(
  chapters: CurriculumChapter[],
  chapter: CurriculumChapter,
  courseTitle?: string | null,
): boolean {
  const title = chapter.title.trim();
  if (!title) {
    return false;
  }
  if (chapters.length === 1) {
    return false;
  }
  if (/^course curriculum$/i.test(title)) {
    return false;
  }
  if (courseTitle && title.toLowerCase() === courseTitle.trim().toLowerCase()) {
    return false;
  }
  return true;
}

export function CourseCurriculumList({
  courseId,
  chapters,
  completedLessonIds,
  unlockedLessonIds,
  activeLessonId,
  requireSequential,
  courseTitle,
}: {
  courseId: number;
  chapters: CurriculumChapter[];
  completedLessonIds: number[];
  unlockedLessonIds?: number[];
  activeLessonId?: number;
  requireSequential?: boolean;
  courseTitle?: string | null;
}) {
  return (
    <div className="flex flex-col">
      {chapters.map(chapter => (
        <div key={chapter.id} className="border-b last:border-b-0">
          {shouldShowChapterHeader(chapters, chapter, courseTitle) ? (
            <p className="bg-secondary/50 px-4 py-2 text-xs font-medium text-muted-foreground">
              {chapter.title}
            </p>
          ) : null}
          <div className="flex flex-col">
            {chapter.lessons.map(lesson => {
              const completed = completedLessonIds.includes(lesson.id);
              const unlocked = unlockedLessonIds
                ? unlockedLessonIds.includes(lesson.id)
                : !requireSequential || lesson.locked !== true;
              const isActive = activeLessonId === lesson.id;
              const duration = formatDuration(lesson.duration_seconds);
              const canOpen = lesson.status === 'published' && unlocked;

              const content = (
                <>
                  <div className="shrink-0">
                    {completed ? (
                      <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <CheckIcon className="size-2.5" aria-hidden="true" />
                      </span>
                    ) : isActive ? (
                      <PlayIcon className="size-4 text-foreground" aria-hidden="true" />
                    ) : !unlocked ? (
                      <LockIcon
                        className="size-4 text-muted-foreground/50"
                        aria-hidden="true"
                      />
                    ) : (
                      <CircleIcon
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate',
                      isActive ? 'font-medium text-foreground' : 'text-foreground',
                      completed && !isActive ? 'text-muted-foreground' : null,
                    )}
                  >
                    {lesson.title}
                  </span>
                  {duration ? (
                    <span className="ml-auto flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                      <ClockIcon className="size-3" aria-hidden="true" />
                      {duration}
                    </span>
                  ) : null}
                  <span className="sr-only">
                    {completed ? <Trans message="(completed)" /> : null}
                  </span>
                </>
              );

              if (!canOpen) {
                return (
                  <div
                    key={lesson.id}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm opacity-70"
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={lesson.id}
                  to={`/my-portal/courses/${courseId}/lessons/${lesson.id}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                    isActive ? 'bg-secondary font-medium' : 'hover:bg-secondary/50',
                  )}
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
      {!chapters.length ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">
          <Trans message="No lessons published yet." />
        </p>
      ) : null}
    </div>
  );
}
