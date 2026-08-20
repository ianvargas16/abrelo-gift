import { describe, expect, it } from 'vitest';
import { defaultGift } from '../src/config/defaultGift';
import { createGiftFile, GIFT_FILE_SCHEMA, parseGiftFile } from '../src/models/giftConfig';
import { createPublishApp } from './app';
import {
  GIFT_ID_PATTERN,
  MAX_GIFT_FILE_BYTES,
  injectGiftFileIntoRuntimeHtml,
} from './giftPublishing';
import type { PublishedGiftRepository, PublishedGiftSnapshot } from './publishedGiftRepository';

const runtimeHtml = `<!doctype html>
<html><body><div id="root"></div><script id="abrelo-gift-data" type="application/json"></script><script type="module" src="/assets/runtime.js"></script></body></html>`;

class MemoryPublishedGiftRepository implements PublishedGiftRepository {
  private readonly snapshots = new Map<string, PublishedGiftSnapshot>();

  async create(snapshot: PublishedGiftSnapshot): Promise<void> {
    this.snapshots.set(snapshot.id, structuredClone(snapshot));
  }

  async getById(id: string): Promise<PublishedGiftSnapshot | null> {
    const snapshot = this.snapshots.get(id);
    return snapshot ? structuredClone(snapshot) : null;
  }
}

function createTestContext(overrides: { publicBaseUrl?: string; allowedOrigins?: string } = {}) {
  const repository = new MemoryPublishedGiftRepository();
  const app = createPublishApp({
    repository,
    assets: {
      async fetch() {
        return new Response(runtimeHtml, { headers: { 'Content-Type': 'text/html' } });
      },
    },
    publicBaseUrl: overrides.publicBaseUrl ?? 'https://gifts.example',
    allowedOrigins: overrides.allowedOrigins ?? 'http://localhost:1420',
    now: () => new Date('2026-08-20T12:00:00.000Z'),
  });

  return { app, repository };
}

function publishRequest(body: unknown, origin = 'http://localhost:1420'): Request {
  return new Request('https://api.example/api/gifts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function publish(app: ReturnType<typeof createPublishApp>, gift = defaultGift) {
  const response = await app(publishRequest(createGiftFile(gift)));
  const result = await response.json() as { id: string; url: string };
  return { response, result };
}

describe('publish Worker', () => {
  it('publishes a valid canonical GiftFile', async () => {
    const { app, repository } = createTestContext();
    const { response, result } = await publish(app);

    expect(response.status).toBe(201);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:1420');
    expect(GIFT_ID_PATTERN.test(result.id)).toBe(true);
    expect((await repository.getById(result.id))?.giftFile).toEqual(createGiftFile(defaultGift));
  });

  it('rejects malformed and unsupported GiftFiles', async () => {
    const { app } = createTestContext();
    const malformed = await app(publishRequest({ schema: GIFT_FILE_SCHEMA, version: 1, gift: {} }));
    const unsupported = await app(publishRequest({
      schema: GIFT_FILE_SCHEMA,
      version: 99,
      gift: defaultGift,
    }));

    expect(malformed.status).toBe(400);
    expect(unsupported.status).toBe(400);
    expect(await malformed.json()).toEqual({ error: 'No pudimos publicar el regalo.' });
  });

  it('rejects oversized payloads before parsing', async () => {
    const { app } = createTestContext();
    const response = await app(publishRequest('x'.repeat(MAX_GIFT_FILE_BYTES + 1)));

    expect(response.status).toBe(413);
  });

  it('generates separate opaque IDs for repeated publications', async () => {
    const { app } = createTestContext();
    const first = await publish(app);
    const second = await publish(app);

    expect(first.result.id).not.toBe(second.result.id);
    expect(first.result.id).toHaveLength(22);
    expect(second.result.id).toHaveLength(22);
  });

  it('serves a published snapshot through the recipient Runtime shell', async () => {
    const { app } = createTestContext();
    const gift = { ...defaultGift, recipientName: 'Contenido publicado' };
    const { result } = await publish(app, gift);
    const response = await app(new Request(result.url));
    const html = await response.text();
    const payload = html.match(/<script id="abrelo-gift-data" type="application\/json">([\s\S]*?)<\/script>/u)?.[1];

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(payload).toBeTruthy();
    expect(parseGiftFile(JSON.parse(payload!))).toEqual(gift);
  });

  it('keeps an earlier published URL immutable after another publication', async () => {
    const { app } = createTestContext();
    const firstGift = { ...defaultGift, recipientName: 'Versión A' };
    const secondGift = { ...defaultGift, recipientName: 'Versión B' };
    const first = await publish(app, firstGift);
    await publish(app, secondGift);
    const response = await app(new Request(first.result.url));
    const html = await response.text();
    const payload = html.match(/<script id="abrelo-gift-data" type="application\/json">([\s\S]*?)<\/script>/u)?.[1];

    expect(parseGiftFile(JSON.parse(payload!)).recipientName).toBe('Versión A');
  });

  it('returns the recipient-safe unavailable shell for unknown IDs', async () => {
    const { app } = createTestContext();
    const response = await app(new Request(`https://gifts.example/g/${'A'.repeat(22)}`));
    const html = await response.text();

    expect(response.status).toBe(404);
    expect(html).toContain('<script id="abrelo-gift-data" type="application/json"></script>');
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it('returns the safe Runtime shell with 503 when the repository fails', async () => {
    const repository: PublishedGiftRepository = {
      async create() {},
      async getById() {
        throw new Error('storage unavailable');
      },
    };
    const app = createPublishApp({
      repository,
      assets: {
        async fetch() {
          return new Response(runtimeHtml, { headers: { 'Content-Type': 'text/html' } });
        },
      },
      publicBaseUrl: 'https://gifts.example',
      allowedOrigins: 'http://localhost:1420',
    });
    const response = await app(new Request(`https://gifts.example/g/${'A'.repeat(22)}`));
    const html = await response.text();

    expect(response.status).toBe(503);
    expect(html).toContain('<script id="abrelo-gift-data" type="application/json"></script>');
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
  });

  it('returns a controlled 503 when the Runtime shell cannot be loaded', async () => {
    const repository = new MemoryPublishedGiftRepository();
    const app = createPublishApp({
      repository,
      assets: {
        async fetch() {
          throw new Error('asset service unavailable');
        },
      },
      publicBaseUrl: 'https://gifts.example',
      allowedOrigins: 'http://localhost:1420',
    });
    const response = await app(new Request(`https://gifts.example/g/${'A'.repeat(22)}`));

    expect(response.status).toBe(503);
    expect(await response.text()).toBe('Este regalo no está disponible.');
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
  });

  it('returns a controlled 503 when an existing gift cannot be injected', async () => {
    const repository = new MemoryPublishedGiftRepository();
    const app = createPublishApp({
      repository,
      assets: {
        async fetch() {
          return new Response('<!doctype html><html><body><div id="root"></div></body></html>');
        },
      },
      publicBaseUrl: 'https://gifts.example',
      allowedOrigins: 'http://localhost:1420',
    });
    const snapshot: PublishedGiftSnapshot = {
      id: 'A'.repeat(22),
      giftFile: createGiftFile(defaultGift),
      createdAt: '2026-08-20T12:00:00.000Z',
    };
    await repository.create(snapshot);
    const response = await app(new Request(`https://gifts.example/g/${snapshot.id}`));

    expect(response.status).toBe(503);
    expect(await response.text()).toContain('<div id="root"></div>');
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
  });

  it('does not expose a list endpoint', async () => {
    const { app } = createTestContext();
    await publish(app);
    const response = await app(new Request('https://api.example/api/gifts'));

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: 'Ruta no disponible.' });
  });

  it('rejects unsupported methods on recipient routes', async () => {
    const { app } = createTestContext();
    const response = await app(new Request(`https://gifts.example/g/${'A'.repeat(22)}`, {
      method: 'POST',
    }));

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET');
  });

  it('safely injects script-looking text and preserves the original GiftConfig', () => {
    const maliciousText = '</script><script>alert(1)</script>';
    const gift = createGiftFile({
      ...defaultGift,
      letter: { ...defaultGift.letter, message: maliciousText },
    });
    const html = injectGiftFileIntoRuntimeHtml(runtimeHtml, gift);
    const payload = html.match(/<script id="abrelo-gift-data" type="application\/json">([\s\S]*?)<\/script>/u)?.[1];

    expect(html).not.toContain(maliciousText);
    expect(payload).toContain('\\u003c/script\\u003e');
    expect(parseGiftFile(JSON.parse(payload!)).letter.message).toBe(maliciousText);
  });

  it('returns the public URL from server configuration', async () => {
    const { app } = createTestContext({ publicBaseUrl: 'https://share.example' });
    const { result } = await publish(app);

    expect(result.url).toBe(`https://share.example/g/${result.id}`);
  });

  it('rejects unapproved CORS origins and accepts configured preflight requests', async () => {
    const { app } = createTestContext();
    const rejected = await app(publishRequest(createGiftFile(defaultGift), 'https://unapproved.example'));
    const preflight = await app(new Request('https://api.example/api/gifts', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:1420' },
    }));

    expect(rejected.status).toBe(403);
    expect(rejected.headers.has('Access-Control-Allow-Origin')).toBe(false);
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:1420');
  });
});
