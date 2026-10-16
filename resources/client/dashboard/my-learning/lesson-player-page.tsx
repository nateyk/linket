import {MyPortalShell} from '@app/digital-products/public/my-portal-shell';
import {Alert} from '@shadcn/alert/alert';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Field} from '@shadcn/forms/field';
import {
  RadioGroup,
  RadioGroupItem,
} from '@shadcn/forms/radio-group/radio-group';
import {Progress} from '@shadcn/progress/progress';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@shadcn/sheet/sheet';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Spinner} from '@shadcn/spinner/spinner';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {
  completePortalLesson,
  fetchPortalCourseLearn,
  fetchPortalLesson,
} from '@app/digital-products/public/my-portal-api';
import {apiClient} from '@common/http/query-client';
import {isAxiosError} from 'axios';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckBigIcon,
  CircleXIcon,
  DownloadIcon,
  ListIcon,
  LockIcon,
  PlayIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link, useParams, useNavigate} from 'react-router';
import {CourseCurriculumList} from './course-curriculum-list';
import {LessonVideo} from './lesson-video';

type LessonData = {
  id: number;
  chapter_id: number;
  course_id: number;
  title: string;
  content?: string | null;
  summary?: string | null;
  video_type?: string | null;
  video_url?: string | null;
  video?: {url: string} | null;
  status: string;
  content_type?: 'video' | 'readable';
  resources: {
    id: number;
    display_name: string;
    file: {id: number; name: string};
  }[];
};

type QuizQuestion = {
  id: number;
  type: string;
  question_text: string;
  options: string[] | null;
  sort_order: number;
};

type QuizData = {
  id: number;
  require_pass_to_progress: boolean;
  passing_score: number;
  questions: QuizQuestion[];
};

type QuizAttempt = {
  id: number;
  score: number;
  passed: boolean;
  answers: Record<string, string> | null;
  created_at: string;
};

type QuizAttemptResult = {
  id: number;
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  details: Array<{
    question_id: number;
    given: string | null;
    correct_answer: string;
    is_correct: boolean;
  }>;
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True or False',
};

function questionTypeLabel(type: string): string {
  return QUESTION_TYPE_LABELS[type] ?? type;
}

function answerLabel(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return 'No answer';
  }
  if (value === 'true' || value === 'false') {
    return value === 'true' ? 'True' : 'False';
  }
  return value;
}

export function Component() {
  const {courseId, lessonId} = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [course, setCourse] = useState<any>(null);
  const [trial, setTrial] = useState(false);
  const [error, setError] = useState<string>();
  const [completing, setCompleting] = useState(false);
  const [progressError, setProgressError] = useState<string>();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [, setQuizLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetchPortalLesson(
          String(courseId),
          String(lessonId),
          signal,
        );
        setLesson(response.data.data);
      } catch (reason) {
        if (isAxiosError(reason) && reason.response?.status === 403) {
          setTrial(true);
          return;
        }
        throw reason;
      }

      const response = await fetchPortalCourseLearn(
        String(courseId),
        signal,
      );
      setCourse(response.data.data);
    },
    [courseId, lessonId],
  );

  const loadAttempts = useCallback(async (quizId: number) => {
    setAttemptsLoading(true);
    try {
      const response = await apiClient.get(
        `/api/v1/quizzes/${quizId}/attempts`,
      );
      setAttempts(response.data.data ?? []);
    } catch {
      setAttempts([]);
    } finally {
      setAttemptsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLesson(null);
    setCourse(null);
    setTrial(false);
    setError(undefined);
    void load(controller.signal).catch(reason => {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError('Unable to load this lesson.');
      }
    });
    return () => controller.abort();
  }, [load]);

  // Fetch the quiz (if any) for the current lesson.
  useEffect(() => {
    if (!lesson?.id) return;
    const controller = new AbortController();
    setQuiz(null);
    setAnswers({});
    setResult(null);
    setProgressError(undefined);
    setQuizLoading(true);
    apiClient
      .get(`/api/v1/course-lessons/${lesson.id}/quiz`, {
        signal: controller.signal,
      })
      .then(response => setQuiz(response.data.data ?? null))
      .catch(reason => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setQuiz(null);
        }
      })
      .finally(() => setQuizLoading(false));
    return () => controller.abort();
  }, [lesson?.id]);

  // Load attempt history once we know the quiz id.
  useEffect(() => {
    if (!quiz?.id) {
      setAttempts([]);
      return;
    }
    void loadAttempts(quiz.id);
  }, [quiz?.id, loadAttempts]);

  const complete = async () => {
    setCompleting(true);
    setProgressError(undefined);
    try {
      await completePortalLesson(String(courseId), String(lessonId));
      if (course) {
        const flat = course.chapters.flatMap((ch: any) => ch.lessons);
        const idx = flat.findIndex((l: any) => l.id === Number(lessonId));
        const next = flat[idx + 1];
        if (next)
          navigate(`/my-portal/courses/${courseId}/lessons/${next.id}`);
        else navigate(`/my-portal/courses/${courseId}`);
      }
    } catch (reason) {
      if (isAxiosError(reason) && reason.response?.status === 422) {
        setProgressError(
          reason.response?.data?.message ??
            'Pass the quiz before completing this lesson.',
        );
      } else {
        setError('Unable to update lesson progress.');
      }
    } finally {
      setCompleting(false);
    }
  };

  const setAnswer = (questionId: number, value: string) => {
    setAnswers(prev => ({...prev, [String(questionId)]: value}));
  };

  const submitQuiz = async () => {
    if (!quiz) return;
    setSubmitting(true);
    setProgressError(undefined);
    try {
      const response = await apiClient.post(
        `/api/v1/quizzes/${quiz.id}/attempts`,
        {answers},
      );
      setResult(response.data.data);
      await loadAttempts(quiz.id);
    } catch {
      setProgressError('Unable to submit your quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const retakeQuiz = () => {
    setAnswers({});
    setResult(null);
    setProgressError(undefined);
  };

  if (trial) {
    return (
      <MyPortalShell wide>
        <Alert.Root variant="warning" fillStyle="subtleFill">
          <LockIcon className="size-8 text-muted-foreground" />
          <Alert.Title>
            <Trans message="Lesson locked" />
          </Alert.Title>
          <Alert.Description>
            <Trans message="This lesson is locked. Complete previous lessons to unlock." />
          </Alert.Description>
        </Alert.Root>
        <Button
          className="w-fit"
          render={<Link to={`/my-portal/courses/${courseId}`} />}
        >
          <Trans message="Back to course" />
        </Button>
      </MyPortalShell>
    );
  }

  if (error) {
    return (
      <MyPortalShell wide>
        <Alert.Root variant="warning" fillStyle="subtleFill">
          <Alert.Title>
            <Trans message="Lesson unavailable" />
          </Alert.Title>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
        <Button className="w-fit" render={<Link to="/my-portal" />}>
          <Trans message="Back to My Portal" />
        </Button>
      </MyPortalShell>
    );
  }

  if (!lesson) {
    return (
      <MyPortalShell wide>
        <div className="flex min-h-64 items-center justify-center">
          <Spinner />
        </div>
      </MyPortalShell>
    );
  }

  const quizSection = quiz ? (
    <LessonQuiz
      quiz={quiz}
      answers={answers}
      onAnswer={setAnswer}
      onSubmit={() => void submitQuiz()}
      submitting={submitting}
      result={result}
      onRetake={retakeQuiz}
      attempts={attempts}
      attemptsLoading={attemptsLoading}
    />
  ) : null;

  const unlockedLessonIds: number[] =
    course?.unlocked_lesson_ids ??
    course?.progress?.unlocked_lesson_ids ??
    [];
  const completedLessonIds: number[] =
    course?.progress?.completed_lesson_ids ?? [];
  const progressPercent: number = course?.progress?.percent ?? 0;

  const curriculumPanel = course ? (
    <Card.Root className="gap-0 overflow-hidden py-0 shadow-none">
      <Card.Header className="border-b py-4">
        <Card.Title className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <PlayIcon className="size-4 text-primary" />
            <Trans message="Course curriculum" />
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {course.progress?.completed ?? 0}/{course.progress?.total ?? 0}
          </span>
        </Card.Title>
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <Trans
              message=":percent% complete"
              values={{percent: progressPercent}}
            />
          </div>
          <Progress.Root value={progressPercent}>
            <Progress.Track className="h-1.5">
              <Progress.Indicator />
            </Progress.Track>
          </Progress.Root>
        </div>
      </Card.Header>
      <Card.Content className="p-0">
        <div className="max-h-[480px] overflow-y-auto lg:max-h-[calc(100vh-14rem)]">
          <CourseCurriculumList
            courseId={Number(courseId)}
            chapters={course.chapters ?? []}
            completedLessonIds={completedLessonIds}
            unlockedLessonIds={unlockedLessonIds}
            activeLessonId={Number(lessonId)}
            requireSequential={course.require_sequential_completion}
          />
        </div>
      </Card.Content>
    </Card.Root>
  ) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              render={<Link to={`/my-portal/courses/${courseId}`} />}
            >
              <ChevronLeftIcon />
              <span className="hidden sm:inline">
                <Trans message="Course" />
              </span>
            </Button>
            <div className="hidden h-5 w-px bg-border sm:block" />
            <h1 className="truncate text-sm font-medium sm:text-base">
              {lesson.title}
            </h1>
          </div>
          {course ? (
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 lg:hidden"
                  />
                }
              >
                <ListIcon />
                <span className="hidden sm:inline">
                  <Trans message="Curriculum" />
                </span>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full max-w-md overflow-y-auto p-0 sm:max-w-md"
              >
                <SheetHeader className="border-b p-4">
                  <SheetTitle>
                    <Trans message="Course curriculum" />
                  </SheetTitle>
                </SheetHeader>
                {curriculumPanel}
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {lesson.content_type === 'video' ? (
              <>
                <LessonVideo
                  title={lesson.title}
                  videoUrl={lesson.video_url}
                  fileUrl={lesson.video?.url}
                />
                <Tabs.Root defaultValue="summary" className="w-full">
                  <Tabs.List variant="line" className="w-full">
                    <Tabs.Tab value="summary">
                      <Trans message="Summary" />
                    </Tabs.Tab>
                    <Tabs.Tab value="attachments">
                      <Trans message="Attachments" />
                    </Tabs.Tab>
                    {quiz && (
                      <Tabs.Tab value="quiz">
                        <Trans message="Quiz" />
                      </Tabs.Tab>
                    )}
                  </Tabs.List>
                  <Tabs.Panel value="summary">
                    {lesson.summary ? (
                      <Card.Root>
                        <Card.Content
                          className="prose prose-sm max-w-none p-6"
                          dangerouslySetInnerHTML={{__html: lesson.summary}}
                        />
                      </Card.Root>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        <Trans message="No summary added yet." />
                      </p>
                    )}
                  </Tabs.Panel>
                  <Tabs.Panel value="attachments">
                    {lesson.resources.length > 0 ? (
                      <Card.Root>
                        <Card.Header className="p-4">
                          <Card.Title className="text-sm">
                            <Trans message="Resources" />
                          </Card.Title>
                        </Card.Header>
                        <Card.Content className="flex flex-col gap-2 p-4 pt-0">
                          {lesson.resources.map(r => (
                            <a
                              key={r.id}
                              href={`/api/v1/course-lesson-resources/${r.id}/download`}
                              className="flex items-center gap-2 rounded-card border p-3 text-sm hover:bg-muted/30"
                            >
                              <DownloadIcon className="size-4" />
                              <span className="flex-1">{r.display_name}</span>
                            </a>
                          ))}
                        </Card.Content>
                      </Card.Root>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        <Trans message="No attachments added yet." />
                      </p>
                    )}
                  </Tabs.Panel>
                  {quiz && (
                    <Tabs.Panel value="quiz">{quizSection}</Tabs.Panel>
                  )}
                </Tabs.Root>
              </>
            ) : (
              <>
                {lesson.content && (
                  <Card.Root>
                    <Card.Content
                      className="prose prose-sm max-w-none p-6"
                      dangerouslySetInnerHTML={{__html: lesson.content}}
                    />
                  </Card.Root>
                )}
                {!!lesson.resources.length && (
                  <Card.Root>
                    <Card.Header className="p-4">
                      <Card.Title className="text-sm">
                        <Trans message="Resources" />
                      </Card.Title>
                    </Card.Header>
                    <Card.Content className="flex flex-col gap-2 p-4 pt-0">
                      {lesson.resources.map(r => (
                        <a
                          key={r.id}
                          href={`/api/v1/course-lesson-resources/${r.id}/download`}
                          className="flex items-center gap-2 rounded-card border p-3 text-sm hover:bg-muted/30"
                        >
                          <DownloadIcon className="size-4" />
                          <span className="flex-1">{r.display_name}</span>
                        </a>
                      ))}
                    </Card.Content>
                  </Card.Root>
                )}
                {quizSection && (
                  <section className="flex flex-col gap-3">
                    <h2 className="text-lg font-semibold">
                      <Trans message="Quiz" />
                    </h2>
                    {quizSection}
                  </section>
                )}
              </>
            )}

            {progressError && (
              <Alert.Root variant="warning" fillStyle="subtleFill">
                <Alert.Description>{progressError}</Alert.Description>
              </Alert.Root>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                disabled={completing}
                onClick={() => {
                  if (course) {
                    const flat = course.chapters.flatMap(
                      (ch: any) => ch.lessons,
                    );
                    const idx = flat.findIndex(
                      (l: any) => l.id === Number(lessonId),
                    );
                    const prev = flat[idx - 1];
                    if (prev)
                      navigate(
                        `/my-portal/courses/${courseId}/lessons/${prev.id}`,
                      );
                  }
                }}
              >
                <ChevronLeftIcon />
                <Trans message="Previous" />
              </Button>
              <Button disabled={completing} onClick={() => void complete()}>
                {completing ? <Spinner /> : <CheckIcon />}
                <Trans message="Complete & Next" />
              </Button>
              <Button
                variant="outline"
                disabled={completing}
                onClick={() => {
                  if (course) {
                    const flat = course.chapters.flatMap(
                      (ch: any) => ch.lessons,
                    );
                    const idx = flat.findIndex(
                      (l: any) => l.id === Number(lessonId),
                    );
                    const next = flat[idx + 1];
                    if (next)
                      navigate(
                        `/my-portal/courses/${courseId}/lessons/${next.id}`,
                      );
                  }
                }}
              >
                <Trans message="Next" />
                <ChevronRightIcon />
              </Button>
            </div>
          </div>

          <div className="hidden lg:col-span-1 lg:block">
            <div className="sticky top-20">{curriculumPanel}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

function LessonQuiz({
  quiz,
  answers,
  onAnswer,
  onSubmit,
  submitting,
  result,
  onRetake,
  attempts,
  attemptsLoading,
}: {
  quiz: QuizData;
  answers: Record<string, string>;
  onAnswer: (questionId: number, value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  result: QuizAttemptResult | null;
  onRetake: () => void;
  attempts: QuizAttempt[];
  attemptsLoading: boolean;
}) {
  const allAnswered = quiz.questions.every(question => {
    const value = answers[String(question.id)];
    return value !== undefined && value !== '';
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          <Trans
            message="Passing score: :score%"
            values={{score: quiz.passing_score}}
          />
        </Badge>
        <Badge variant={quiz.require_pass_to_progress ? 'default' : 'outline'}>
          {quiz.require_pass_to_progress ? (
            <Trans message="Required to progress" />
          ) : (
            <Trans message="Optional" />
          )}
        </Badge>
      </div>

      {result ? (
        <Card.Root>
          <Card.Header className="p-4">
            <Card.Title className="flex items-center gap-2 text-sm">
              <Trans message="Quiz result" />
              <Badge variant={result.passed ? 'positive' : 'destructive'}>
                {result.passed ? (
                  <Trans message="Passed" />
                ) : (
                  <Trans message="Not passed" />
                )}
              </Badge>
            </Card.Title>
            <Card.Description>
              <Trans
                message="You scored :score% (:correct of :total correct)."
                values={{
                  score: result.score,
                  correct: result.correct,
                  total: result.total,
                }}
              />
            </Card.Description>
          </Card.Header>
          <Card.Content className="flex flex-col gap-2 p-4 pt-0">
            {result.details.map(detail => {
              const question = quiz.questions.find(
                q => q.id === detail.question_id,
              );
              return (
                <div
                  key={detail.question_id}
                  className="flex flex-col gap-2 rounded-card border p-3 text-sm"
                >
                  <p className="font-medium">{question?.question_text}</p>
                  <p
                    className={
                      detail.is_correct
                        ? 'flex items-center gap-2 text-positive'
                        : 'flex items-center gap-2 text-destructive'
                    }
                  >
                    {detail.is_correct ? (
                      <CircleCheckBigIcon className="size-4" />
                    ) : (
                      <CircleXIcon className="size-4" />
                    )}
                    <Trans
                      message="Your answer: :answer"
                      values={{answer: answerLabel(detail.given)}}
                    />
                  </p>
                  {!detail.is_correct && (
                    <p className="text-muted-foreground">
                      <Trans
                        message="Correct answer: :answer"
                        values={{answer: answerLabel(detail.correct_answer)}}
                      />
                    </p>
                  )}
                </div>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={onRetake}
            >
              <Trans message="Retake quiz" />
            </Button>
          </Card.Content>
        </Card.Root>
      ) : (
        <>
          {quiz.questions.map((question, index) => (
            <Card.Root key={question.id}>
              <Card.Header className="p-4">
                <Card.Title className="text-sm">
                  <Trans
                    message="Question :number"
                    values={{number: index + 1}}
                  />
                </Card.Title>
                <Card.Description>{question.question_text}</Card.Description>
              </Card.Header>
              <Card.Content className="flex flex-col gap-2 p-4 pt-0">
                <Field.Root>
                  {question.type === 'multiple_choice' && question.options ? (
                    <RadioGroup
                      value={answers[String(question.id)] ?? ''}
                      onValueChange={value =>
                        onAnswer(question.id, String(value))
                      }
                    >
                      {question.options.map(option => (
                        <Field.Item key={option}>
                          <Field.Label>
                            <RadioGroupItem value={option} />
                            <Field.Title>{option}</Field.Title>
                          </Field.Label>
                        </Field.Item>
                      ))}
                    </RadioGroup>
                  ) : (
                    <RadioGroup
                      value={answers[String(question.id)] ?? ''}
                      onValueChange={value =>
                        onAnswer(question.id, String(value))
                      }
                    >
                      {['true', 'false'].map(value => (
                        <Field.Item key={value}>
                          <Field.Label>
                            <RadioGroupItem value={value} />
                            <Field.Title>
                              {value === 'true' ? (
                                <Trans message="True" />
                              ) : (
                                <Trans message="False" />
                              )}
                            </Field.Title>
                          </Field.Label>
                        </Field.Item>
                      ))}
                    </RadioGroup>
                  )}
                </Field.Root>
                <p className="text-xs text-muted-foreground">
                  {questionTypeLabel(question.type)}
                </p>
              </Card.Content>
            </Card.Root>
          ))}
          <Button
            className="w-fit"
            disabled={!allAnswered || submitting}
            onClick={onSubmit}
          >
            {submitting && <Spinner />}
            <Trans message={submitting ? 'Submitting...' : 'Submit quiz'} />
          </Button>
        </>
      )}

      <Card.Root>
        <Card.Header className="p-4">
          <Card.Title className="text-sm">
            <Trans message="Attempt history" />
          </Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-2 p-4 pt-0">
          {attemptsLoading ? (
            <Skeleton className="h-12 w-full rounded-card" />
          ) : attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              <Trans message="No attempts yet." />
            </p>
          ) : (
            attempts.map(attempt => (
              <div
                key={attempt.id}
                className="flex items-center justify-between gap-3 rounded-card border p-3 text-sm"
              >
                <span className="text-muted-foreground">
                  {new Date(attempt.created_at).toLocaleString()}
                </span>
                <span className="flex items-center gap-2">
                  <span>
                    <Trans
                      message=":score%"
                      values={{score: attempt.score}}
                    />
                  </span>
                  <Badge
                    variant={attempt.passed ? 'positive' : 'destructive'}
                  >
                    {attempt.passed ? (
                      <Trans message="Passed" />
                    ) : (
                      <Trans message="Not passed" />
                    )}
                  </Badge>
                </span>
              </div>
            ))
          )}
        </Card.Content>
      </Card.Root>
    </div>
  );
}
