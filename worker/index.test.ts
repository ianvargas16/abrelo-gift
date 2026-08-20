import { describe, expect, it, vi } from 'vitest';
import worker from './index';

describe('Worker request boundary', () => {
  it('fails safely and logs only an operational event for invalid runtime configuration', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const request = new Request(`https://gifts.example/g/${'A'.repeat(22)}`);
    const env = {
      ENVIRONMENT: 'production',
      PUBLIC_BASE_URL: 'http://127.0.0.1:8787',
      ALLOWED_ORIGINS: '*',
    };

    try {
      const response = await worker.fetch(request as never, env as never);
      const body = await response.text();

      expect(response.status).toBe(503);
      expect(response.headers.get('X-Request-Id')).toMatch(/^[A-Za-z0-9_-]{12}$/u);
      expect(body).toBe('Este regalo no está disponible.');
      expect(consoleError).toHaveBeenCalledTimes(1);

      const loggedEvent = JSON.parse(String(consoleError.mock.calls[0][0]));
      expect(loggedEvent).toEqual({
        level: 'error',
        event: 'invalid_runtime_config',
        requestId: response.headers.get('X-Request-Id'),
      });
      expect(JSON.stringify(loggedEvent)).not.toContain('127.0.0.1');
    } finally {
      consoleError.mockRestore();
    }
  });
});
