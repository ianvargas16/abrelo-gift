import { describe, expect, it, vi } from 'vitest';
import { runDeploymentSmokeTest } from './smoke-deployment.mjs';

const runtimeHtml = '<!doctype html><html><body><div id="root"></div><script id="abrelo-gift-data" type="application/json"></script></body></html>';

function createResponse(body, status, headers = {}) {
  return new Response(body, { status, headers });
}

describe('deployment smoke test', () => {
  it('uses only safe GET requests and validates recipient/API/static surfaces', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(createResponse(runtimeHtml, 404, {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'X-Request-Id': 'request-gift',
      }))
      .mockResolvedValueOnce(createResponse('{"error":"Ruta no disponible."}', 405, {
        'Content-Type': 'application/json',
        'X-Request-Id': 'request-api',
      }))
      .mockResolvedValueOnce(createResponse(runtimeHtml, 200, {
        'Content-Type': 'text/html; charset=utf-8',
      }));
    const write = vi.fn();

    await expect(runDeploymentSmokeTest('https://worker.example.com/', { fetcher, write }))
      .resolves.toEqual({
        origin: 'https://worker.example.com',
        unknownGiftStatus: 404,
        listStatus: 405,
      });

    expect(fetcher.mock.calls).toEqual([
      ['https://worker.example.com/g/AAAAAAAAAAAAAAAAAAAAAA'],
      ['https://worker.example.com/api/gifts'],
      ['https://worker.example.com/runtime.html'],
    ]);
    expect(write).toHaveBeenCalledWith('Deployment smoke test passed for https://worker.example.com.');
  });

  it('rejects recipient HTML containing Creator markers', async () => {
    const fetcher = vi.fn().mockResolvedValue(createResponse(
      runtimeHtml.replace('<div id="root"></div>', '<div class="studio-shell"></div>'),
      404,
      {
        'Content-Type': 'text/html',
        'X-Robots-Tag': 'noindex',
        'Referrer-Policy': 'no-referrer',
        'X-Content-Type-Options': 'nosniff',
        'X-Request-Id': 'request-gift',
      },
    ));

    await expect(runDeploymentSmokeTest('https://worker.example.com', { fetcher, write: vi.fn() }))
      .rejects.toThrow(/forbidden Creator marker/u);
  });

  it('allows HTTP only for localhost smoke targets', async () => {
    await expect(runDeploymentSmokeTest('http://worker.example.com', { fetcher: vi.fn() }))
      .rejects.toThrow(/HTTPS/u);
  });
});
