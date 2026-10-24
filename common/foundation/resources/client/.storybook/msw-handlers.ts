import {http, HttpResponse} from 'msw';

/**
 * Handlers for Storybook stories that exercise network calls.
 * Design-system stories are mostly static; keep this lean.
 */
export const mswHandlers = {
  health: [
    http.get('/api/v1/health', () =>
      HttpResponse.json({status: 'ok'}),
    ),
  ],
};
