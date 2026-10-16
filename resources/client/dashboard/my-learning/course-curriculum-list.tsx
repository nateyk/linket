import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  LockIcon,
  PlayIcon,
} from 'lucide-react';
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

export function CourseCurriculumList({
  courseId,
  chapters,
  completedLessonIds,
  unlockedLessonIds,
  activeLessonId,
  requireSequential,
}: {
  courseId: number;
  chapters: CurriculumChapter[];
  completedLessonIds: number[];
  unlockedLessonIds?: number[];
  activeLessonId?: number;
  requireSequential?: boolean;
}) {
  return (
    <div className="flex flex-col">
      {chapters.map(chapter => (
        <div key={chapter.id} className="border-b last:border-b-0">
          <p className="bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
            {chapter.title}
          </p>
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
                  <div className="mt-0.5 shrink-0">
                    {completed ? (
                      <CheckCircle2Icon className="size-4 text-positive" />
                    ) : isActive ? (
                      <div className="flex size-4 items-center justify-center rounded-full bg-primary">
                        <PlayIcon className="size-2.5 fill-current text-primary-foreground" />
                      </div>
                    ) : !unlocked ? (
                      <LockIcon className="size-4 text-muted-foreground/50" />
                    ) : (
                      <CircleIcon className="size-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm',
                        isActive
                          ? 'font-medium text-primary'
                          : completed
                            ? 'text-muted-foreground'
                            : 'text-foreground',
                      )}
                    >
                      {lesson.title}
                    </p>
                    {duration ? (
                      <div className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                        <ClockIcon className="size-3" />
                        <span className="text-xs">{duration}</span>
                      </div>
                    ) : null}
                  </div>
                </>
              );

              if (!canOpen) {
                return (
                  <div
                    key={lesson.id}
                    className="flex w-full items-start gap-3 border-l-2 border-l-transparent px-4 py-3 text-left opacity-70"
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link
                  key={lesson.id}
                  to={`/my-portal/courses/${courseId}/lessons/${lesson.id}`}
                  className={cn(
                    'flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors hover:bg-muted/40',
                    isActive
                      ? 'border-l-primary bg-primary/5'
                      : 'border-l-transparent',
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
