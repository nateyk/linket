/** @vitest-environment jsdom */
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vitest';
import {CourseMobileLessonResume} from './course-mobile-lesson-resume';

describe('mobile curriculum resume action', () => {
  test('shows the current selected lesson and reopens that editor without losing its context', async () => {
    const user = userEvent.setup();
    const onResume = vi.fn();
    render(
      <CourseMobileLessonResume
        lessonTitle="Editing video basics"
        onResume={onResume}
      />,
    );
    expect(screen.getByText('Editing video basics')).not.toBeNull();
    await user.click(screen.getByRole('button', {name: 'Continue editing'}));
    expect(onResume).toHaveBeenCalledTimes(1);
  });
});
