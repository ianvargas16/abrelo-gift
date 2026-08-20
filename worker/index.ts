import { createPublishApp } from './app';
import { D1PublishedGiftRepository } from './d1PublishedGiftRepository';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  PUBLIC_BASE_URL: string;
  ALLOWED_ORIGINS: string;
}

export default {
  fetch(request, env) {
    return createPublishApp({
      repository: new D1PublishedGiftRepository(env.DB),
      assets: env.ASSETS,
      publicBaseUrl: env.PUBLIC_BASE_URL,
      allowedOrigins: env.ALLOWED_ORIGINS,
    })(request);
  },
} satisfies ExportedHandler<Env>;
