import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://example.com/health', () => HttpResponse.json({ ok: true })),
];
