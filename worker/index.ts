import { createInvalidRuntimeConfigResponse, createPublishApp } from './app';
import { D1PublishedGiftRepository } from './d1PublishedGiftRepository';
import { createOperationalLogger, createRequestId } from './operationalLogging';
import { parseRuntimeConfig } from './runtimeConfig.js';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  GIFT_ASSETS: R2Bucket;
  PUBLISH_RATE_LIMITER: RateLimit;
  AUDIO_RATE_LIMITER: RateLimit;
  ENVIRONMENT: string;
  PUBLIC_BASE_URL: string;
  ALLOWED_ORIGINS: string;
}

const appCache = new WeakMap<object, ReturnType<typeof createPublishApp>>();
const logger = createOperationalLogger();

function getPublishApp(env: Env): ReturnType<typeof createPublishApp> {
  const cachedApp = appCache.get(env);

  if (cachedApp) {
    return cachedApp;
  }

  const runtimeConfig = parseRuntimeConfig(env);
  const app = createPublishApp({
    repository: new D1PublishedGiftRepository(env.DB),
    assets: env.ASSETS,
    giftAssets: env.GIFT_ASSETS,
    publicationRateLimiter: env.PUBLISH_RATE_LIMITER,
    audioRateLimiter: env.AUDIO_RATE_LIMITER,
    runtimeConfig,
    logger,
  });

  appCache.set(env, app);
  return app;
}

export default {
  fetch(request, env) {
    try {
      return getPublishApp(env)(request);
    } catch {
      const requestId = createRequestId();
      logger.error('invalid_runtime_config', requestId);
      return createInvalidRuntimeConfigResponse(request, requestId);
    }
  },
} satisfies ExportedHandler<Env>;
