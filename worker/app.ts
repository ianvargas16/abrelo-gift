import { createGiftFile } from '../src/models/giftConfig';
import {
  GiftPayloadTooLargeError,
  GIFT_ID_PATTERN,
  generateOpaqueGiftId,
  injectPublicMetadataIntoRuntimeHtml,
  injectGiftFileIntoRuntimeHtml,
  parseCanonicalGiftFile,
  readGiftRequestBody,
} from './giftPublishing';
import { createRequestId, type OperationalLogger } from './operationalLogging';
import type { PublishedGiftRepository } from './publishedGiftRepository';
import { createPublicGiftUrl, type RuntimeConfig } from './runtimeConfig.js';

interface RuntimeAssets {
  fetch(request: Request): Promise<Response>;
}

export interface PublishAppOptions {
  repository: PublishedGiftRepository;
  assets: RuntimeAssets;
  runtimeConfig: RuntimeConfig;
  logger?: OperationalLogger;
  requestIdFactory?: () => string;
  now?: () => Date;
}

const API_ERROR_MESSAGE = 'No pudimos publicar el regalo.';
const SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'private, no-store',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
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
  let status: 200 | 404 | 503 = 404;

  if (GIFT_ID_PATTERN.test(id)) {
    try {
      const snapshot = await options.repository.getById(id);
      giftFile = snapshot?.giftFile ?? null;
      status = snapshot ? 200 : 404;
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

  return new Response(body, {
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
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return jsonResponse({ error: API_ERROR_MESSAGE }, 415, allowedOrigin ?? undefined);
  }

  let body: string;

  try {
    body = await readGiftRequestBody(request);
  } catch (error) {
    if (error instanceof GiftPayloadTooLargeError) {
      return jsonResponse({ error: API_ERROR_MESSAGE }, 413, allowedOrigin ?? undefined);
    }

    return jsonResponse({ error: API_ERROR_MESSAGE }, 400, allowedOrigin ?? undefined);
  }

  let giftFile;

  try {
    giftFile = parseCanonicalGiftFile(JSON.parse(body));
  } catch {
    return jsonResponse({ error: API_ERROR_MESSAGE }, 400, allowedOrigin ?? undefined);
  }

  const id = generateOpaqueGiftId();

  try {
    const publicUrl = createPublicGiftUrl(options.runtimeConfig, id);

    await options.repository.create({
      id,
      giftFile: createGiftFile(giftFile.gift),
      createdAt: (options.now ?? (() => new Date()))().toISOString(),
    });

    return jsonResponse({
      id,
      url: publicUrl,
    }, 201, allowedOrigin ?? undefined);
  } catch {
    (options.logger ?? silentLogger).error('publish_persistence_failed', requestId);
    return jsonResponse({ error: API_ERROR_MESSAGE }, 500, allowedOrigin ?? undefined);
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

    if (giftRoute) {
      const requestId = nextRequestId();

      if (request.method !== 'GET') {
        return withRequestId(new Response('Método no permitido.', {
          status: 405,
          headers: { ...SECURITY_HEADERS, Allow: 'GET' },
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
