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

  it.each([
    {
      name: 'PUBLIC_BASE_URL',
      publicBaseUrl: 'https://production.example.invalid',
      allowedOrigins: 'https://creator.example.com',
    },
    {
      name: 'ALLOWED_ORIGINS',
      publicBaseUrl: 'https://gifts.example.com',
      allowedOrigins: 'https://creator-production.example.invalid',
    },
  ])('returns a private 503 when production $name is a reserved placeholder', async ({
    publicBaseUrl,
    allowedOrigins,
  }) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const request = new Request('https://gifts.example.com/api/gifts');
    const env = {
      ENVIRONMENT: 'production',
      PUBLIC_BASE_URL: publicBaseUrl,
      ALLOWED_ORIGINS: allowedOrigins,
    };

    try {
      const response = await worker.fetch(request as never, env as never);
      const body = await response.json();
      const loggedEvent = JSON.parse(String(consoleError.mock.calls[0][0]));

      expect(response.status).toBe(503);
      expect(body).toEqual({ error: 'Servicio no disponible.' });
      expect(loggedEvent).toEqual({
        level: 'error',
        event: 'invalid_runtime_config',
        requestId: response.headers.get('X-Request-Id'),
      });
      expect(JSON.stringify({ body, loggedEvent })).not.toContain('.invalid');
    } finally {
      consoleError.mockRestore();
    }
  });

  it('continues normally with valid production runtime configuration', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const env = {
      ENVIRONMENT: 'production',
      PUBLIC_BASE_URL: 'https://gifts.example.com',
      ALLOWED_ORIGINS: 'https://creator.example.com',
    };

    try {
      const response = await worker.fetch(
        new Request('https://gifts.example.com/api/gifts') as never,
        env as never,
      );

      expect(response.status).toBe(405);
      expect(await response.json()).toEqual({ error: 'Ruta no disponible.' });
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
