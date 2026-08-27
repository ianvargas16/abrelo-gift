import { describe, expect, it } from 'vitest';
import { defaultGift } from '../src/config/defaultGift';
import { createGiftFile, GIFT_FILE_SCHEMA, parseGiftFile } from '../src/models/giftConfig';
import { createPublishApp } from './app';
import { MAX_GIFT_AUDIO_BYTES, type GiftAudioMimeType } from '../src/models/giftAudio';
import { MAX_MULTIPART_BYTES } from './giftAssetPublishing';
import { MAX_GIFT_IMAGE_BYTES, type GiftImageMimeType } from '../src/models/giftMedia';
import {
  GIFT_ID_PATTERN,
  injectPublicMetadataIntoRuntimeHtml,
  MAX_GIFT_FILE_BYTES,
  injectGiftFileIntoRuntimeHtml,
} from './giftPublishing';
import type { OperationalErrorCategory, OperationalLogger } from './operationalLogging';
import type { PublishedGiftRepository, PublishedGiftSnapshot } from './publishedGiftRepository';
import { parseRuntimeConfig } from './runtimeConfig.js';

const runtimeHtml = `<!doctype html>
<html><head><!-- abrelo:public-metadata --></head><body><div id="root"></div><script id="abrelo-gift-data" type="application/json"></script><script type="module" src="/assets/runtime.js"></script></body></html>`;

class MemoryPublishedGiftRepository implements PublishedGiftRepository {
  private readonly snapshots = new Map<string, PublishedGiftSnapshot>();
  createCalls = 0;

  async create(snapshot: PublishedGiftSnapshot): Promise<void> {
    this.createCalls += 1;
    this.snapshots.set(snapshot.id, structuredClone(snapshot));
  }

  async getById(id: string): Promise<PublishedGiftSnapshot | null> {
    const snapshot = this.snapshots.get(id);
    return snapshot ? structuredClone(snapshot) : null;
  }
}

class MemoryGiftAssets {
  readonly objects = new Map<string, { body: Uint8Array; contentType?: string }>();
  putCalls = 0;
  deleteCalls = 0;
  failPut = false;
  failPutAt: number | null = null;
  failDelete = false;

  async put(key: string, value: ReadableStream | ArrayBuffer | Blob, options?: R2PutOptions): Promise<R2Object> {
    this.putCalls += 1;
    if (this.failPut || this.failPutAt === this.putCalls) throw new Error('R2 unavailable');
    const body = new Uint8Array(await new Response(value).arrayBuffer());
    this.objects.set(key, { body });
    return {} as R2Object;
  }

  async get(key: string): Promise<R2ObjectBody | null> {
    const object = this.objects.get(key);
    if (!object) return null;
    return {
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(object.body);
          controller.close();
        },
      }),
      size: object.body.byteLength,
    } as R2ObjectBody;
  }

  async delete(key: string): Promise<void> {
    this.deleteCalls += 1;
    if (this.failDelete) throw new Error('R2 delete unavailable');
    this.objects.delete(key);
  }
}

type TestContextOverrides = {
  publicBaseUrl?: string;
  allowedOrigins?: string;
  repository?: PublishedGiftRepository;
  giftAssets?: MemoryGiftAssets;
  logger?: OperationalLogger;
};

function createTestContext(overrides: TestContextOverrides = {}) {
  const repository = overrides.repository ?? new MemoryPublishedGiftRepository();
  const giftAssets = overrides.giftAssets ?? new MemoryGiftAssets();
  const app = createPublishApp({
    repository,
    giftAssets,
    assets: {
      async fetch() {
        return new Response(runtimeHtml, { headers: { 'Content-Type': 'text/html' } });
      },
    },
    runtimeConfig: parseRuntimeConfig({
      ENVIRONMENT: 'development',
      PUBLIC_BASE_URL: overrides.publicBaseUrl ?? 'https://gifts.example',
      ALLOWED_ORIGINS: overrides.allowedOrigins ?? 'http://localhost:1420',
    }),
    requestIdFactory: () => 'request-test',
    now: () => new Date('2026-08-20T12:00:00.000Z'),
    logger: overrides.logger,
  });

  return { app, repository, giftAssets };
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

function createAudioFile(size: number, mimeType: GiftAudioMimeType = 'audio/mpeg'): File {
  const bytes = new Uint8Array(size);
  if (mimeType === 'audio/mpeg') {
    bytes.set([0x49, 0x44, 0x33, 0x04]);
  } else {
    bytes.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x4d, 0x34, 0x41, 0x20]);
  }
  return new File([bytes], mimeType === 'audio/mpeg' ? 'gift.mp3' : 'gift.m4a', { type: mimeType });
}

function createImageFile(size: number, mimeType: GiftImageMimeType = 'image/jpeg'): File {
  const bytes = new Uint8Array(size);
  if (mimeType === 'image/jpeg') {
    bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  } else if (mimeType === 'image/png') {
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  } else {
    bytes.set([0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
  }
  return new File([bytes], `cover.${mimeType.split('/')[1]}`, { type: mimeType });
}

function multipartPublishRequest(
  entries: Array<[string, string | File]>,
  body?: BodyInit,
): Request {
  const form = new FormData();
  for (const [name, value] of entries) form.append(name, value);
  return new Request('https://api.example/api/gifts', {
    method: 'POST',
    headers: { Origin: 'http://localhost:1420' },
    body: body ?? form,
  });
}

describe('publish Worker', () => {
  it('publishes a valid canonical GiftFile', async () => {
    const { app, repository } = createTestContext();
    const { response, result } = await publish(app);

    expect(response.status).toBe(201);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:1420');
    expect(response.headers.get('X-Request-Id')).toBe('request-test');
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

  it('serves existing published snapshots through the recipient Runtime shell with generic social metadata', async () => {
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
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain(`<link rel="canonical" href="${result.url}" />`);
    expect(head).toContain(`<meta property="og:url" content="${result.url}" />`);
    expect(head).toContain('<meta name="twitter:card" content="summary" />');
    expect(head).not.toContain('Contenido publicado');
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
    const events: Array<{ category: OperationalErrorCategory; requestId: string }> = [];
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
      runtimeConfig: parseRuntimeConfig({
        ENVIRONMENT: 'development',
        PUBLIC_BASE_URL: 'https://gifts.example',
        ALLOWED_ORIGINS: 'http://localhost:1420',
      }),
      requestIdFactory: () => 'request-storage',
      logger: {
        error(category, requestId) {
          events.push({ category, requestId });
        },
      },
    });
    const response = await app(new Request(`https://gifts.example/g/${'A'.repeat(22)}`));
    const html = await response.text();

    expect(response.status).toBe(503);
    expect(html).toContain('<script id="abrelo-gift-data" type="application/json"></script>');
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(response.headers.get('X-Request-Id')).toBe('request-storage');
    expect(events).toEqual([{ category: 'repository_read_failed', requestId: 'request-storage' }]);
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
      runtimeConfig: parseRuntimeConfig({
        ENVIRONMENT: 'development',
        PUBLIC_BASE_URL: 'https://gifts.example',
        ALLOWED_ORIGINS: 'http://localhost:1420',
      }),
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
      runtimeConfig: parseRuntimeConfig({
        ENVIRONMENT: 'development',
        PUBLIC_BASE_URL: 'https://gifts.example',
        ALLOWED_ORIGINS: 'http://localhost:1420',
      }),
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

  it('injects only the public URL into social metadata', () => {
    const publicUrl = `https://gifts.example/g/${'A'.repeat(22)}`;
    const html = injectPublicMetadataIntoRuntimeHtml(runtimeHtml, publicUrl);

    expect(html).toContain(`<link rel="canonical" href="${publicUrl}" />`);
    expect(html).toContain(`<meta property="og:url" content="${publicUrl}" />`);
    expect(html).not.toContain('recipientName');
    expect(html).not.toContain('shareMessage');
  });

  it('escapes public metadata attributes before inserting them into the Runtime shell', () => {
    const html = injectPublicMetadataIntoRuntimeHtml(
      runtimeHtml,
      'https://gifts.example/g/example?note=<untrusted>&label="gift"',
    );

    expect(html).toContain('note=&lt;untrusted&gt;&amp;label=&quot;gift&quot;');
    expect(html).not.toContain('note=<untrusted>');
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

  it('logs persistence failures without passing gift content to the logger', async () => {
    const events: Array<{ category: OperationalErrorCategory; requestId: string }> = [];
    const repository: PublishedGiftRepository = {
      async create() {
        throw new Error('database write failed');
      },
      async getById() {
        return null;
      },
    };
    const app = createPublishApp({
      repository,
      assets: {
        async fetch() {
          return new Response(runtimeHtml, { headers: { 'Content-Type': 'text/html' } });
        },
      },
      runtimeConfig: parseRuntimeConfig({
        ENVIRONMENT: 'development',
        PUBLIC_BASE_URL: 'https://gifts.example',
        ALLOWED_ORIGINS: 'http://localhost:1420',
      }),
      requestIdFactory: () => 'request-publish',
      logger: {
        error(category, requestId) {
          events.push({ category, requestId });
        },
      },
    });
    const response = await app(publishRequest(createGiftFile({
      ...defaultGift,
      recipientName: 'Sensitive recipient',
    })));

    expect(response.status).toBe(503);
    expect(events).toEqual([{ category: 'publish_persistence_failed', requestId: 'request-publish' }]);
    expect(JSON.stringify(events)).not.toContain('Sensitive recipient');
  });

  it('keeps JSON-only publishing unchanged and accepts legacy GiftFiles without audio', async () => {
    const { app, giftAssets } = createTestContext();
    const { response, result } = await publish(app, { ...defaultGift, atmosphere: 'romantic' });

    expect(response.status).toBe(201);
    expect(result.url).toBe(`https://gifts.example/g/${result.id}`);
    expect(giftAssets.putCalls).toBe(0);
  });

  it('publishes valid multipart audio, creates metadata, and keeps internal storage details private', async () => {
    const { app, repository, giftAssets } = createTestContext();
    const response = await app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['audio', createAudioFile(32)],
    ]));
    const result = await response.json() as { id: string; url: string };
    const snapshot = await repository.getById(result.id);

    expect(response.status).toBe(201);
    expect(snapshot?.giftFile.gift.audio).toEqual({ mimeType: 'audio/mpeg' });
    expect(giftAssets.putCalls).toBe(1);
    expect(JSON.stringify(result)).not.toContain('gifts/');
    expect(JSON.stringify(result)).not.toContain('abrelo-gift-assets');
  });

  it('accepts exactly 5 MiB audio and rejects one byte more before writes', async () => {
    const accepted = createTestContext();
    const exact = await accepted.app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['audio', createAudioFile(MAX_GIFT_AUDIO_BYTES)],
    ]));
    const rejected = createTestContext();
    const oversized = await rejected.app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['audio', createAudioFile(MAX_GIFT_AUDIO_BYTES + 1)],
    ]));

    expect(exact.status).toBe(201);
    expect(oversized.status).toBe(400);
    expect(await oversized.json()).toEqual({ error: 'Audio demasiado grande' });
    expect(rejected.giftAssets.putCalls).toBe(0);
    expect((rejected.repository as MemoryPublishedGiftRepository).createCalls).toBe(0);
  });

  it('rejects oversized multipart bodies before parsing or storage writes', async () => {
    const { app, repository, giftAssets } = createTestContext();
    const response = await app(new Request('https://api.example/api/gifts', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=abrelo',
        Origin: 'http://localhost:1420',
      },
      body: new Uint8Array(MAX_MULTIPART_BYTES + 1),
    }));

    expect(response.status).toBe(413);
    expect(giftAssets.putCalls).toBe(0);
    expect((repository as MemoryPublishedGiftRepository).createCalls).toBe(0);
  });

  it('rejects unsupported audio MIME types before writes', async () => {
    const unsupported = createTestContext();
    const unsupportedResponse = await unsupported.app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['audio', new File(['not audio'], 'gift.pdf', { type: 'application/pdf' })],
    ]));

    expect(unsupportedResponse.status).toBe(400);
    expect(await unsupportedResponse.json()).toEqual({ error: 'Tipo de audio no permitido' });
    expect(unsupported.giftAssets.putCalls).toBe(0);
    expect((unsupported.repository as MemoryPublishedGiftRepository).createCalls).toBe(0);
  });

  it('accepts the allowed WAV MIME variants without inspecting binary media', async () => {
    for (const mimeType of ['audio/wav', 'audio/x-wav'] as const) {
      const { app, repository, giftAssets } = createTestContext();
      const response = await app(multipartPublishRequest([
        ['gift', JSON.stringify(createGiftFile(defaultGift))],
        ['audio', createAudioFile(32, mimeType)],
      ]));
      const { id } = await response.json() as { id: string };

      expect(response.status).toBe(201);
      expect((await repository.getById(id))?.giftFile.gift.audio).toEqual({ mimeType });
      expect(giftAssets.putCalls).toBe(1);
    }
  });

  it('rejects multipart audio fields that do not contain a file before writes', async () => {
    const { app, repository, giftAssets } = createTestContext();
    const response = await app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['audio', 'not a file'],
    ]));

    expect(response.status).toBe(400);
    expect(giftAssets.putCalls).toBe(0);
    expect((repository as MemoryPublishedGiftRepository).createCalls).toBe(0);
  });

  it('rejects duplicate audio parts and unexpected multipart fields before writes', async () => {
    const duplicate = createTestContext();
    const duplicateResponse = await duplicate.app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['audio', createAudioFile(32)],
      ['audio', createAudioFile(32)],
    ]));
    const unexpected = createTestContext();
    const unexpectedResponse = await unexpected.app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['notes', 'unexpected'],
    ]));

    expect(duplicateResponse.status).toBe(400);
    expect(unexpectedResponse.status).toBe(400);
    expect(duplicate.giftAssets.putCalls + unexpected.giftAssets.putCalls).toBe(0);
    expect((duplicate.repository as MemoryPublishedGiftRepository).createCalls).toBe(0);
    expect((unexpected.repository as MemoryPublishedGiftRepository).createCalls).toBe(0);
  });

  it('rejects malformed GiftFiles before any R2 or D1 write', async () => {
    const { app, repository, giftAssets } = createTestContext();
    const response = await app(multipartPublishRequest([
      ['gift', JSON.stringify({ schema: GIFT_FILE_SCHEMA, version: 1, gift: {} })],
      ['audio', createAudioFile(32)],
    ]));

    expect(response.status).toBe(400);
    expect(giftAssets.putCalls).toBe(0);
    expect((repository as MemoryPublishedGiftRepository).createCalls).toBe(0);
  });

  it('does not persist a D1 snapshot when R2 upload fails', async () => {
    const giftAssets = new MemoryGiftAssets();
    giftAssets.failPut = true;
    const { app, repository } = createTestContext({ giftAssets });
    const response = await app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['audio', createAudioFile(32)],
    ]));

    expect(response.status).toBe(503);
    expect((repository as MemoryPublishedGiftRepository).createCalls).toBe(0);
    expect(giftAssets.deleteCalls).toBe(0);
  });

  it('cleans an uploaded audio object when the following cover upload fails', async () => {
    const giftAssets = new MemoryGiftAssets();
    giftAssets.failPutAt = 2;
    const { app, repository } = createTestContext({ giftAssets });
    const response = await app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['audio', createAudioFile(32)],
      ['coverImage', createImageFile(32)],
    ]));

    expect(response.status).toBe(503);
    expect(giftAssets.putCalls).toBe(2);
    expect(giftAssets.deleteCalls).toBe(1);
    expect(giftAssets.objects.size).toBe(0);
    expect((repository as MemoryPublishedGiftRepository).createCalls).toBe(0);
  });

  it('cleans up the R2 object after a D1 failure', async () => {
    const giftAssets = new MemoryGiftAssets();
    const repository: PublishedGiftRepository = {
      async create() { throw new Error('D1 unavailable'); },
      async getById() { return null; },
    };
    const { app } = createTestContext({ repository, giftAssets });
    const response = await app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['audio', createAudioFile(32)],
    ]));

    expect(response.status).toBe(503);
    expect(giftAssets.deleteCalls).toBe(1);
    expect(giftAssets.objects.size).toBe(0);
  });

  it('logs a privacy-safe event when R2 cleanup after a D1 failure also fails', async () => {
    const events: Array<{ category: OperationalErrorCategory; requestId: string }> = [];
    const giftAssets = new MemoryGiftAssets();
    giftAssets.failDelete = true;
    const repository: PublishedGiftRepository = {
      async create() { throw new Error('D1 unavailable'); },
      async getById() { return null; },
    };
    const { app } = createTestContext({
      repository,
      giftAssets,
      logger: { error(category: OperationalErrorCategory, requestId: string) { events.push({ category, requestId }); } },
    });
    const response = await app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['audio', createAudioFile(32)],
    ]));

    expect(response.status).toBe(503);
    expect(giftAssets.deleteCalls).toBe(1);
    expect(events).toEqual([
      { category: 'gift_asset_cleanup_failed', requestId: 'request-test' },
      { category: 'publish_persistence_failed', requestId: 'request-test' },
    ]);
    expect(JSON.stringify(events)).not.toContain('gifts/');
  });

  it('returns 404 for unknown gifts and silent gifts on the audio route', async () => {
    const { app } = createTestContext();
    const unknown = await app(new Request(`https://gifts.example/g/${'A'.repeat(22)}/audio`));
    const { result } = await publish(app);
    const silent = await app(new Request(`${result.url}/audio`));

    expect(unknown.status).toBe(404);
    expect(silent.status).toBe(404);
  });

  it('streams audio through safe headers without exposing the private R2 key', async () => {
    const { app } = createTestContext();
    const published = await app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['audio', createAudioFile(32, 'audio/mp4')],
    ]));
    const { url } = await published.json() as { url: string };
    const response = await app(new Request(`${url}/audio`));
    const body = await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('audio/mp4');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(body.byteLength).toBe(32);
    expect(response.url).not.toContain('gifts/');
  });

  it('publishes a valid background image with public metadata and no private storage details', async () => {
    const { app, repository, giftAssets } = createTestContext();
    const response = await app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['coverImage', createImageFile(48, 'image/webp')],
    ]));
    const result = await response.json() as { id: string; url: string };
    const snapshot = await repository.getById(result.id);

    expect(response.status).toBe(201);
    expect(snapshot?.giftFile.gift.backgroundImage).toEqual({ mimeType: 'image/webp', size: 48 });
    expect(giftAssets.putCalls).toBe(1);
    expect(JSON.stringify(snapshot?.giftFile)).not.toContain('gifts/');
    expect(JSON.stringify(result)).not.toContain('abrelo-gift-assets');
  });

  it('accepts exactly 5 MiB background images and rejects one byte more before writes', async () => {
    const accepted = createTestContext();
    const exact = await accepted.app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['coverImage', createImageFile(MAX_GIFT_IMAGE_BYTES)],
    ]));
    const rejected = createTestContext();
    const oversized = await rejected.app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['coverImage', createImageFile(MAX_GIFT_IMAGE_BYTES + 1)],
    ]));

    expect(exact.status).toBe(201);
    expect(oversized.status).toBe(400);
    expect(await oversized.json()).toEqual({ error: 'Imagen demasiado grande' });
    expect(rejected.giftAssets.putCalls).toBe(0);
    expect((rejected.repository as MemoryPublishedGiftRepository).createCalls).toBe(0);
  });

  it('rejects unsupported or signature-mismatched background images before writes', async () => {
    for (const file of [
      new File(['not an image'], 'cover.pdf', { type: 'application/pdf' }),
      new File(['not a jpeg'], 'cover.jpg', { type: 'image/jpeg' }),
    ]) {
      const context = createTestContext();
      const response = await context.app(multipartPublishRequest([
        ['gift', JSON.stringify(createGiftFile(defaultGift))],
        ['coverImage', file],
      ]));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Tipo de imagen no permitido' });
      expect(context.giftAssets.putCalls).toBe(0);
      expect((context.repository as MemoryPublishedGiftRepository).createCalls).toBe(0);
    }
  });

  it('rejects duplicate background image parts before writes', async () => {
    const { app, repository, giftAssets } = createTestContext();
    const response = await app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['coverImage', createImageFile(32)],
      ['coverImage', createImageFile(32)],
    ]));

    expect(response.status).toBe(400);
    expect(giftAssets.putCalls).toBe(0);
    expect((repository as MemoryPublishedGiftRepository).createCalls).toBe(0);
  });

  it('removes the uploaded background image when D1 persistence fails', async () => {
    const giftAssets = new MemoryGiftAssets();
    const repository: PublishedGiftRepository = {
      async create() { throw new Error('D1 unavailable'); },
      async getById() { return null; },
    };
    const { app } = createTestContext({ repository, giftAssets });
    const response = await app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['coverImage', createImageFile(32)],
    ]));

    expect(response.status).toBe(503);
    expect(giftAssets.deleteCalls).toBe(1);
    expect(giftAssets.objects.size).toBe(0);
  });

  it('serves background images through the compatible route and returns 404 when absent', async () => {
    const { app } = createTestContext();
    const unknown = await app(new Request(`https://gifts.example/g/${'A'.repeat(22)}/cover`));
    const silentGift = await publish(app);
    const absent = await app(new Request(`${silentGift.result.url}/cover`));
    const published = await app(multipartPublishRequest([
      ['gift', JSON.stringify(createGiftFile(defaultGift))],
      ['coverImage', createImageFile(48, 'image/png')],
    ]));
    const { url } = await published.json() as { url: string };
    const response = await app(new Request(`${url}/cover`));

    expect(unknown.status).toBe(404);
    expect(absent.status).toBe(404);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Content-Disposition')).toBe('inline');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect((await response.arrayBuffer()).byteLength).toBe(48);
    expect(response.url).not.toContain('gifts/');
  });

  it('serves a Milestone 28 stored image as a background without republishing', async () => {
    const id = 'L'.repeat(22);
    const legacyGiftFile = createGiftFile({ ...defaultGift }) as unknown as {
      schema: string;
      version: number;
      gift: Record<string, unknown>;
    };
    legacyGiftFile.gift.coverImage = { mimeType: 'image/jpeg', size: 4 };
    const normalizedGiftFile = createGiftFile(parseGiftFile(legacyGiftFile));
    const repository: PublishedGiftRepository = {
      async create() {},
      async getById(requestedId) {
        return requestedId === id
          ? { id, giftFile: normalizedGiftFile, createdAt: '2026-08-20T12:00:00.000Z' }
          : null;
      },
    };
    const giftAssets = new MemoryGiftAssets();
    giftAssets.objects.set(`gifts/${id}/cover`, { body: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) });
    const { app } = createTestContext({ repository, giftAssets });

    const recipientPage = await app(new Request(`https://gifts.example/g/${id}`));
    const background = await app(new Request(`https://gifts.example/g/${id}/cover`));

    expect(recipientPage.status).toBe(200);
    expect(await recipientPage.text()).toContain('"backgroundImage"');
    expect(background.status).toBe(200);
    expect(background.headers.get('Content-Type')).toBe('image/jpeg');
  });
});
