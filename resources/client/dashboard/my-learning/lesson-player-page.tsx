import {MyOrderShell} from '@app/digital-products/public/my-order-shell';
import {Alert} from '@shadcn/alert/alert';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {
  RadioGroup,
  RadioGroupItem,
} from '@shadcn/forms/radio-group/radio-group';
import {Spinner} from '@shadcn/spinner/spinner';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {apiClient} from '@common/http/query-client';
import {isAxiosError} from 'axios';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  LockIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link, useParams, useNavigate} from 'react-router';

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
  const [quizLoading, setQuizLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await apiClient.get(
          `/api/v1/courses/${courseId}/learn/lessons/${lessonId}`,
          {signal},
        );
        setLesson(response.data.data);
      } catch (reason) {
        if (isAxiosError(reason) && reason.response?.status === 403) {
          setTrial(true);
          return;
        }
        throw reason;
      }

      const response = await apiClient.get(
        `/api/v1/courses/${courseId}/learn`,
        {signal},
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
      await apiClient.post(`/api/v1/course-lessons/${lessonId}/complete`);
      if (course) {
        const flat = course.chapters.flatMap((ch: any) => ch.lessons);
        const idx = flat.findIndex((l: any) => l.id === Number(lessonId));
        const next = flat[idx + 1];
        if (next)
          navigate(`/my-order/courses/${courseId}/lessons/${next.id}`);
        else navigate(`/my-order/courses/${courseId}`);
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
      <MyOrderShell wide>
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
          render={<Link to={`/my-order/courses/${courseId}`} />}
        >
          <Trans message="Back to course" />
        </Button>
      </MyOrderShell>
    );
  }

  if (error) {
    return (
      <MyOrderShell wide>
        <Alert.Root variant="warning" fillStyle="subtleFill">
          <Alert.Title>
            <Trans message="Lesson unavailable" />
          </Alert.Title>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
        <Button className="w-fit" render={<Link to="/my-order" />}>
          <Trans message="Back to my orders" />
        </Button>
      </MyOrderShell>
    );
  }

  if (!lesson) {
    return (
      <MyOrderShell wide>
        <div className="flex min-h-64 items-center justify-center">
          <Spinner />
        </div>
      </MyOrderShell>
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

  return (
    <MyOrderShell wide>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Trans message="Course lesson" />
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lesson.title}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link to={`/my-order/courses/${courseId}`} />}
        >
          <Trans message="Course" />
        </Button>
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {lesson.content_type === 'video' ? (
          <>
            {lesson.video_url && (
              <div className="aspect-video overflow-hidden rounded-card border bg-muted">
                <iframe
                  src={lesson.video_url}
                  className="size-full"
                  allowFullScreen
                  title={lesson.title}
                />
              </div>
            )}
            {lesson.video?.url && !lesson.video_url && (
              <div className="aspect-video overflow-hidden rounded-card border bg-muted">
                <video src={lesson.video.url} controls className="size-full" />
              </div>
            )}
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
                const flat = course.chapters.flatMap((ch: any) => ch.lessons);
                const idx = flat.findIndex(
                  (l: any) => l.id === Number(lessonId),
                );
                const prev = flat[idx - 1];
                if (prev)
                  navigate(`/my-order/courses/${courseId}/lessons/${prev.id}`);
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
                const flat = course.chapters.flatMap((ch: any) => ch.lessons);
                const idx = flat.findIndex(
                  (l: any) => l.id === Number(lessonId),
                );
                const next = flat[idx + 1];
                if (next)
                  navigate(`/my-order/courses/${courseId}/lessons/${next.id}`);
              }
            }}
          >
            <Trans message="Next" />
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </MyOrderShell>
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
    <div className="flex flex-col gap-4">
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
                  className="flex flex-col gap-1 rounded-card border p-3 text-sm"
                >
                  <p className="font-medium">{question?.question_text}</p>
                  <p
                    className={
                      detail.is_correct ? 'text-positive' : 'text-destructive'
                    }
                  >
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
                {question.type === 'multiple_choice' && question.options ? (
                  <RadioGroup
                    value={answers[String(question.id)] ?? ''}
                    onValueChange={value =>
                      onAnswer(question.id, String(value))
                    }
                  >
                    {question.options.map(option => (
                      <label
                        key={option}
                        className="flex items-center gap-2 text-sm"
                      >
                        <RadioGroupItem value={option} />
                        <span>{option}</span>
                      </label>
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
                      <label
                        key={value}
                        className="flex items-center gap-2 text-sm"
                      >
                        <RadioGroupItem value={value} />
                        <span>
                          {value === 'true' ? (
                            <Trans message="True" />
                          ) : (
                            <Trans message="False" />
                          )}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                )}
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
            <Spinner />
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
