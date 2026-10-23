/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {describe, expect, test, vi} from 'vitest';
import {PortalOverview} from './portal-overview';
import type {PortalCourse} from './my-portal-library-ui';

const inProgress: PortalCourse = {
  course_id: 1,
  title: 'Advanced AI Applications',
  total_lessons: 24,
  percent: 63,
  next_lesson_id: 16,
};

const orders = [
  {
    id: 'ORD-1',
    product_title: 'Midnight Signals',
    product_type: 'audio',
    currency: 'etb',
    gross_amount_cents: 1900,
    paid_at: '2026-10-18T00:00:00Z',
  },
];

describe('PortalOverview', () => {
  test('hides the continue card when there is no in-progress course', () => {
    render(
      <MemoryRouter>
        <PortalOverview
          firstName="Abel"
          courses={[]}
          orders={[]}
          onNavigate={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Continue learning')).toBeNull();
    expect(screen.getByText('Welcome back, Abel')).toBeTruthy();
  });

  test('shows continue learning and navigates from jump cards', () => {
    const onNavigate = vi.fn();
    render(
      <MemoryRouter>
        <PortalOverview
          firstName="Abel"
          courses={[inProgress]}
          orders={orders}
          onNavigate={onNavigate}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Continue learning')).toBeTruthy();
    expect(screen.getByText('Advanced AI Applications')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', {name: /Courses/i}));
    expect(onNavigate).toHaveBeenCalledWith('courses');

    fireEvent.click(screen.getByRole('button', {name: /Files/i}));
    expect(onNavigate).toHaveBeenCalledWith('downloads');

    fireEvent.click(screen.getByRole('button', {name: /Tracks/i}));
    expect(onNavigate).toHaveBeenCalledWith('audio');
  });
});
