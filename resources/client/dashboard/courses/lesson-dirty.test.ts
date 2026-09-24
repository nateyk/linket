import {describe, expect, test} from 'vitest';
import {
  isLessonEditorDirty,
  normalizeQuizForCompare,
  type LessonDirtySnapshot,
} from './lesson-dirty';

const base: LessonDirtySnapshot = {
  title: 'Intro',
  status: 'draft',
  videoUrl: '',
  videoType: null,
  videoFileEntryId: null,
  content: 'hello',
  contentType: 'video',
  resourceIds: [1, 2],
  quizJson: null,
};

describe('normalizeQuizForCompare', () => {
  test('drops randomUUID keys before comparing', () => {
    const quiz = {
      require_pass_to_progress: false,
      passing_score: 70,
      questions: [{key: 'aaa', type: 'multiple_choice', question_text: 'Q?'}],
    };
    expect(normalizeQuizForCompare(quiz)).toBe(
      normalizeQuizForCompare({
        require_pass_to_progress: false,
        passing_score: 70,
        questions: [{key: 'zzz', type: 'multiple_choice', question_text: 'Q?'}],
      }),
    );
  });

  test('null and missing quizzes normalize to null', () => {
    expect(normalizeQuizForCompare(null)).toBeNull();
    expect(normalizeQuizForCompare(undefined)).toBeNull();
  });
});

describe('isLessonEditorDirty', () => {
  test('clean when identical', () => {
    expect(isLessonEditorDirty(base, {...base})).toBe(false);
  });

  test('flags field, resource, and quiz changes', () => {
    expect(isLessonEditorDirty({...base, title: 'Other'}, base)).toBe(true);
    expect(isLessonEditorDirty({...base, resourceIds: [2, 1]}, base)).toBe(true);
    expect(
      isLessonEditorDirty({...base, quizJson: '{"a":1}'}, base),
    ).toBe(true);
  });
});
