import { createGiftFile } from '../src/models/giftConfig';
import {
  GiftPayloadTooLargeError,
  GIFT_ID_PATTERN,
  generateOpaqueGiftId,
  injectPublicMetadataIntoRuntimeHtml,
  injectGiftFileIntoRuntimeHtml,
} from './giftPublishing';
import {
  AudioTooLargeError,
  getGiftAudioKey,
  getGiftBackgroundImageKey,
  getGiftMemoryImageKey,
  ImageTooLargeError,
  parsePublishRequest,
  UnsupportedAudioError,
  UnsupportedImageError,
} from './giftAssetPublishing';
import { createRequestId, type OperationalLogger } from './operationalLogging';
import type { PublishedGiftRepository } from './publishedGiftRepository';
import { createPublicGiftUrl, type RuntimeConfig } from './runtimeConfig.js';

interface RuntimeAssets {
  fetch(request: Request): Promise<Response>;
}
interface GiftAssets {
  put(key: string, value: ReadableStream | ArrayBuffer | Blob, options?: R2PutOptions): Promise<R2Object>;
  head(key: string): Promise<R2Object | null>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
}

export interface PublishAppOptions {
  repository: PublishedGiftRepository;
  assets: RuntimeAssets;
  giftAssets?: GiftAssets;
  runtimeConfig: RuntimeConfig;
  logger?: OperationalLogger;
  requestIdFactory?: () => string;
  now?: () => Date;
}

const API_ERROR_MESSAGE = 'No pudimos publicar el regalo.';
const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'private, no-store',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
};

function jsonResponse(body: unknown, status: number, allowedOrigin?: string): Response {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });

  if (allowedOrigin) {
    headers.set('Access-Control-Allow-Origin', allowedOrigin);
    headers.set('Vary', 'Origin');
  }

  return Response.json(body, { status, headers });
}

const silentLogger: OperationalLogger = {
  error() {},
};

function withRequestId(response: Response, requestId: string): Response {
  response.headers.set('X-Request-Id', requestId);
  return response;
}

function getAllowedOrigin(request: Request, configuredOrigins: ReadonlySet<string>): string | null | false {
  const origin = request.headers.get('origin');

  if (!origin) {
    return null;
  }

  const sameOrigin = new URL(request.url).origin;
  return origin === sameOrigin || configuredOrigins.has(origin) ? origin : false;
}

async function loadRuntimeShell(request: Request, assets: RuntimeAssets): Promise<Response> {
  const runtimeUrl = new URL('/runtime.html', request.url);
  return assets.fetch(new Request(runtimeUrl, { method: 'GET' }));
}

async function renderRecipientPage(
  request: Request,
  options: PublishAppOptions,
  id: string,
  requestId: string,
): Promise<Response> {
  const logger = options.logger ?? silentLogger;
  let giftFile = null;
  let backgroundImageAvailable = false;
  let status: 200 | 404 | 503 = 404;

  if (GIFT_ID_PATTERN.test(id)) {
    try {
      const snapshot = await options.repository.getById(id);
      giftFile = snapshot?.giftFile ?? null;
      status = snapshot ? 200 : 404;

      if (giftFile?.gift.backgroundImage) {
        try {
          backgroundImageAvailable = Boolean(
            await options.giftAssets?.head(getGiftBackgroundImageKey(id)),
          );
        } catch {
          logger.error('gift_asset_read_failed', requestId);
        }
      }
    } catch {
      status = 503;
      logger.error('repository_read_failed', requestId);
    }
  }

  let shell: Response;

  try {
    shell = await loadRuntimeShell(request, options.assets);
  } catch {
    logger.error('runtime_shell_failed', requestId);
    return new Response('Este regalo no está disponible.', {
      status: 503,
      headers: SECURITY_HEADERS,
    });
  }

  if (!shell.ok) {
    logger.error('runtime_shell_failed', requestId);
    return new Response('Este regalo no está disponible.', {
      status: 503,
      headers: SECURITY_HEADERS,
    });
  }

  let runtimeHtml: string;

  try {
    runtimeHtml = await shell.text();
  } catch {
    logger.error('runtime_shell_failed', requestId);
    return new Response('Este regalo no está disponible.', {
      status: 503,
      headers: SECURITY_HEADERS,
    });
  }

  let body = runtimeHtml;

  if (giftFile) {
    try {
      body = injectPublicMetadataIntoRuntimeHtml(
        injectGiftFileIntoRuntimeHtml(runtimeHtml, giftFile),
        createPublicGiftUrl(options.runtimeConfig, id),
        giftFile,
        backgroundImageAvailable,
      );
    } catch {
      status = 503;
      logger.error('runtime_injection_failed', requestId);
    }
  }

  const headers = new Headers(shell.headers);

  headers.delete('Content-Length');
  headers.delete('ETag');
  headers.set('Content-Type', 'text/html; charset=utf-8');

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(request.method === 'HEAD' ? null : body, {
    status,
    headers,
  });
}

async function publishGift(
  request: Request,
  options: PublishAppOptions,
  allowedOrigin: string | null,
  requestId: string,
): Promise<Response> {
  let parsed;
  try {
    parsed = await parsePublishRequest(request);
  } catch (error) {
    if (error instanceof AudioTooLargeError) {
      return jsonResponse({ error: 'Audio demasiado grande' }, 400, allowedOrigin ?? undefined);
    }
    if (error instanceof GiftPayloadTooLargeError) {
      return jsonResponse({ error: API_ERROR_MESSAGE }, 413, allowedOrigin ?? undefined);
    }
    if (error instanceof UnsupportedAudioError) {
      return jsonResponse({ error: 'Tipo de audio no permitido' }, 400, allowedOrigin ?? undefined);
    }
    if (error instanceof ImageTooLargeError) {
      return jsonResponse({ error: 'Imagen demasiado grande' }, 400, allowedOrigin ?? undefined);
    }
    if (error instanceof UnsupportedImageError) {
      return jsonResponse({ error: 'Tipo de imagen no permitido' }, 400, allowedOrigin ?? undefined);
    }
    return jsonResponse({ error: API_ERROR_MESSAGE }, 400, allowedOrigin ?? undefined);
  }

  const id = generateOpaqueGiftId();
  const audioKey = parsed.audio ? getGiftAudioKey(id) : null;
  const backgroundImageKey = parsed.backgroundImage ? getGiftBackgroundImageKey(id) : null;
  const memoryImageKeys = parsed.memories.map(({ item }) => getGiftMemoryImageKey(id, item.id));
  const logger = options.logger ?? silentLogger;
  const gift = {
    ...parsed.giftFile.gift,
    ...(parsed.audio ? { audio: parsed.audio.metadata } : {}),
    ...(parsed.backgroundImage ? { backgroundImage: parsed.backgroundImage.metadata } : {}),
  };
  const uploadedKeys: string[] = [];

  const cleanUpUploadedAssets = async () => {
    if (!options.giftAssets) return;
    for (const key of uploadedKeys) {
      try {
        await options.giftAssets.delete(key);
      } catch {
        logger.error('gift_asset_cleanup_failed', requestId);
      }
    }
  };

  try {
    if (parsed.audio && audioKey) {
      if (!options.giftAssets) throw new Error('gift asset storage unavailable');
      await options.giftAssets.put(audioKey, parsed.audio.file.stream(), { httpMetadata: { contentType: parsed.audio.metadata.mimeType } });
      uploadedKeys.push(audioKey);
    }
    if (parsed.backgroundImage && backgroundImageKey) {
      if (!options.giftAssets) throw new Error('gift asset storage unavailable');
      await options.giftAssets.put(backgroundImageKey, parsed.backgroundImage.file.stream(), { httpMetadata: { contentType: parsed.backgroundImage.metadata.mimeType } });
      uploadedKeys.push(backgroundImageKey);
    }
    for (const [index, memory] of parsed.memories.entries()) {
      if (!options.giftAssets) throw new Error('gift asset storage unavailable');
      const key = memoryImageKeys[index];
      await options.giftAssets.put(key, memory.file.stream(), { httpMetadata: { contentType: memory.item.image.mimeType } });
      uploadedKeys.push(key);
    }
  } catch {
    await cleanUpUploadedAssets();
    logger.error('publish_persistence_failed', requestId);
    return jsonResponse({ error: API_ERROR_MESSAGE }, 503, allowedOrigin ?? undefined);
  }

  try {
    await options.repository.create({
      id,
      giftFile: createGiftFile(gift),
      createdAt: (options.now ?? (() => new Date()))().toISOString(),
    });
  } catch {
    await cleanUpUploadedAssets();
    logger.error('publish_persistence_failed', requestId);
    return jsonResponse({ error: API_ERROR_MESSAGE }, 503, allowedOrigin ?? undefined);
  }

  return jsonResponse({
    id,
    url: createPublicGiftUrl(options.runtimeConfig, id),
  }, 201, allowedOrigin ?? undefined);
}

async function serveGiftAudio(options: PublishAppOptions, id: string): Promise<Response> {
  if (!GIFT_ID_PATTERN.test(id)) return new Response('No encontrado.', { status: 404, headers: SECURITY_HEADERS });
  try {
    const snapshot = await options.repository.getById(id);
    if (!snapshot?.giftFile.gift.audio) return new Response('No encontrado.', { status: 404, headers: SECURITY_HEADERS });
    const object = await options.giftAssets?.get(getGiftAudioKey(id));
    if (!object) return new Response('No encontrado.', { status: 404, headers: SECURITY_HEADERS });
    const headers = new Headers({ 'Cache-Control': 'private, max-age=3600', 'Content-Type': snapshot.giftFile.gift.audio.mimeType, 'X-Content-Type-Options': 'nosniff' });
    if (object.size) headers.set('Content-Length', String(object.size));
    return new Response(object.body, { headers });
  } catch { return new Response('No encontrado.', { status: 404, headers: SECURITY_HEADERS }); }
}

async function serveGiftBackgroundImage(
  options: PublishAppOptions,
  id: string,
  method: 'GET' | 'HEAD',
): Promise<Response> {
  if (!GIFT_ID_PATTERN.test(id)) return new Response('No encontrado.', { status: 404, headers: SECURITY_HEADERS });
  try {
    const snapshot = await options.repository.getById(id);
    const metadata = snapshot?.giftFile.gift.backgroundImage;
    if (!metadata) return new Response('No encontrado.', { status: 404, headers: SECURITY_HEADERS });
    const object = method === 'HEAD'
      ? await options.giftAssets?.head(getGiftBackgroundImageKey(id))
      : await options.giftAssets?.get(getGiftBackgroundImageKey(id));
    if (!object) return new Response('No encontrado.', { status: 404, headers: SECURITY_HEADERS });
    const headers = new Headers({
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': 'inline',
      'Content-Type': metadata.mimeType,
      'X-Content-Type-Options': 'nosniff',
    });
    if (object.size) headers.set('Content-Length', String(object.size));
    return new Response(method === 'HEAD' ? null : (object as R2ObjectBody).body, { headers });
  } catch {
    return new Response('No encontrado.', { status: 404, headers: SECURITY_HEADERS });
  }
}

async function serveGiftMemoryImage(options: PublishAppOptions, id: string, memoryId: string): Promise<Response> {
  if (!GIFT_ID_PATTERN.test(id)) return new Response('No encontrado.', { status: 404, headers: SECURITY_HEADERS });
  try {
    const snapshot = await options.repository.getById(id);
    const memory = snapshot?.giftFile.gift.memories?.items.find((item) => 'id' in item && item.id === memoryId);
    if (!memory || !('id' in memory)) return new Response('No encontrado.', { status: 404, headers: SECURITY_HEADERS });
    const object = await options.giftAssets?.get(getGiftMemoryImageKey(id, memory.id));
    if (!object) return new Response('No encontrado.', { status: 404, headers: SECURITY_HEADERS });
    const headers = new Headers({
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': 'inline',
      'Content-Type': memory.image.mimeType,
      'X-Content-Type-Options': 'nosniff',
    });
    if (object.size) headers.set('Content-Length', String(object.size));
    return new Response(object.body, { headers });
  } catch {
    return new Response('No encontrado.', { status: 404, headers: SECURITY_HEADERS });
  }
}

export function createInvalidRuntimeConfigResponse(request: Request, requestId: string): Response {
  const url = new URL(request.url);
  const response = url.pathname.startsWith('/api/')
    ? jsonResponse({ error: 'Servicio no disponible.' }, 503)
    : new Response('Este regalo no está disponible.', {
      status: 503,
      headers: SECURITY_HEADERS,
    });

  return withRequestId(response, requestId);
}

export function createPublishApp(options: PublishAppOptions) {
  const allowedOrigins = new Set(options.runtimeConfig.allowedOrigins);
  const nextRequestId = options.requestIdFactory ?? createRequestId;

  return async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/gifts') {
      const requestId = nextRequestId();
      const allowedOrigin = getAllowedOrigin(request, allowedOrigins);

      if (allowedOrigin === false) {
        return withRequestId(jsonResponse({ error: API_ERROR_MESSAGE }, 403), requestId);
      }

      if (request.method === 'OPTIONS') {
        const headers = new Headers({
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Max-Age': '86400',
          Allow: 'POST, OPTIONS',
          Vary: 'Origin',
        });

        if (allowedOrigin) {
          headers.set('Access-Control-Allow-Origin', allowedOrigin);
        }

        return withRequestId(new Response(null, { status: 204, headers }), requestId);
      }

      if (request.method !== 'POST') {
        const response = jsonResponse({ error: 'Ruta no disponible.' }, 405, allowedOrigin ?? undefined);
        response.headers.set('Allow', 'POST, OPTIONS');
        return withRequestId(response, requestId);
      }

      return withRequestId(await publishGift(request, options, allowedOrigin, requestId), requestId);
    }

    const giftRoute = url.pathname.match(/^\/g\/([^/]+)$/u);

    const audioRoute = url.pathname.match(/^\/g\/([^/]+)\/audio$/u);
    if (audioRoute) {
      const requestId = nextRequestId();
      if (request.method !== 'GET') return withRequestId(new Response('Método no permitido.', { status: 405, headers: { ...SECURITY_HEADERS, Allow: 'GET' } }), requestId);
      return withRequestId(await serveGiftAudio(options, audioRoute[1]), requestId);
    }

    // Keep `/cover` as the stable public asset route for gifts published by Milestone 28.
    const backgroundImageRoute = url.pathname.match(/^\/g\/([^/]+)\/cover$/u);
    if (backgroundImageRoute) {
      const requestId = nextRequestId();
      if (request.method !== 'GET' && request.method !== 'HEAD') return withRequestId(new Response('Método no permitido.', { status: 405, headers: { ...SECURITY_HEADERS, Allow: 'GET, HEAD' } }), requestId);
      return withRequestId(await serveGiftBackgroundImage(options, backgroundImageRoute[1], request.method), requestId);
    }

    const memoryImageRoute = url.pathname.match(/^\/g\/([^/]+)\/memories\/([^/]+)$/u);
    if (memoryImageRoute) {
      const requestId = nextRequestId();
      if (request.method !== 'GET') return withRequestId(new Response('Método no permitido.', { status: 405, headers: { ...SECURITY_HEADERS, Allow: 'GET' } }), requestId);
      return withRequestId(await serveGiftMemoryImage(options, memoryImageRoute[1], memoryImageRoute[2]), requestId);
    }

    if (giftRoute) {
      const requestId = nextRequestId();

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return withRequestId(new Response('Método no permitido.', {
          status: 405,
          headers: { ...SECURITY_HEADERS, Allow: 'GET, HEAD' },
        }), requestId);
      }

      return withRequestId(
        await renderRecipientPage(request, options, giftRoute[1], requestId),
        requestId,
      );
    }

    if (url.pathname.startsWith('/api/')) {
      return withRequestId(
        jsonResponse({ error: 'Ruta no disponible.' }, 404),
        nextRequestId(),
      );
    }

    return options.assets.fetch(request);
  };
}
