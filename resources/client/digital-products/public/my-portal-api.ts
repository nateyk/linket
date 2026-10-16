import {auth} from '@common/auth/use-auth';
import {apiClient} from '@common/http/query-client';
import {isAxiosError} from 'axios';
import type {AxiosResponse} from 'axios';

async function withPortalFallback<T>(
  sanctumRequest: () => Promise<AxiosResponse<T>>,
  portalRequest: () => Promise<AxiosResponse<T>>,
): Promise<AxiosResponse<T>> {
  if (!auth.isLoggedIn) {
    return portalRequest();
  }

  try {
    return await sanctumRequest();
  } catch (reason) {
    if (
      isAxiosError(reason) &&
      (reason.response?.status === 401 || reason.response?.status === 403)
    ) {
      return portalRequest();
    }
    throw reason;
  }
}

export function fetchPortalCourseLearn(
  courseId: string,
  signal?: AbortSignal,
) {
  return withPortalFallback(
    () =>
      apiClient.get(`/api/v1/courses/${courseId}/learn`, {
        signal,
      }),
    () =>
      apiClient.get(`/api/v1/public/my-portal/courses/${courseId}`, {
        signal,
      }),
  );
}

export function fetchPortalLesson(
  courseId: string,
  lessonId: string,
  signal?: AbortSignal,
) {
  return withPortalFallback(
    () =>
      apiClient.get(
        `/api/v1/courses/${courseId}/learn/lessons/${lessonId}`,
        {signal},
      ),
    () =>
      apiClient.get(
        `/api/v1/public/my-portal/courses/${courseId}/lessons/${lessonId}`,
        {signal},
      ),
  );
}

export function completePortalLesson(courseId: string, lessonId: string) {
  return withPortalFallback(
    () => apiClient.post(`/api/v1/course-lessons/${lessonId}/complete`),
    () =>
      apiClient.post(
        `/api/v1/public/my-portal/courses/${courseId}/lessons/${lessonId}/complete`,
      ),
  );
}
