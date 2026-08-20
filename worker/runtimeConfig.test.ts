import { describe, expect, it } from 'vitest';
import {
  createPublicGiftUrl,
  parseRuntimeConfig,
  RuntimeConfigError,
} from './runtimeConfig.js';

describe('Worker runtime configuration', () => {
  it('accepts local development URLs and normalizes duplicate origins', () => {
    const config = parseRuntimeConfig({
      ENVIRONMENT: 'development',
      PUBLIC_BASE_URL: 'http://127.0.0.1:8787/',
      ALLOWED_ORIGINS: ' http://localhost:1420/, http://localhost:1420, tauri://localhost ',
    });

    expect(config).toEqual({
      environment: 'development',
      publicBaseUrl: 'http://127.0.0.1:8787',
      allowedOrigins: ['http://localhost:1420', 'tauri://localhost'],
    });
  });

  it('rejects localhost and HTTP public URLs in production', () => {
    expect(() => parseRuntimeConfig({
      ENVIRONMENT: 'production',
      PUBLIC_BASE_URL: 'https://localhost:8787',
      ALLOWED_ORIGINS: 'https://creator.example.com',
    })).toThrow(RuntimeConfigError);

    expect(() => parseRuntimeConfig({
      ENVIRONMENT: 'production',
      PUBLIC_BASE_URL: 'http://gifts.example.com',
      ALLOWED_ORIGINS: 'https://creator.example.com',
    })).toThrow(/non-local HTTPS/u);
  });

  it('rejects wildcard, localhost, and malformed production Creator origins', () => {
    expect(() => parseRuntimeConfig({
      ENVIRONMENT: 'production',
      PUBLIC_BASE_URL: 'https://gifts.example.com',
      ALLOWED_ORIGINS: '*',
    })).toThrow(/wildcards/u);

    expect(() => parseRuntimeConfig({
      ENVIRONMENT: 'production',
      PUBLIC_BASE_URL: 'https://gifts.example.com',
      ALLOWED_ORIGINS: 'https://localhost:1420',
    })).toThrow(/non-local HTTPS/u);

    expect(() => parseRuntimeConfig({
      ENVIRONMENT: 'production',
      PUBLIC_BASE_URL: 'https://gifts.example.com',
      ALLOWED_ORIGINS: 'not an origin',
    })).toThrow(/valid URL origin/u);
  });

  it('rejects paths, queries, hashes, and credentials', () => {
    const values = [
      'https://gifts.example.com/path',
      'https://gifts.example.com?source=config',
      'https://gifts.example.com#fragment',
      'https://user:password@gifts.example.com',
    ];

    for (const publicBaseUrl of values) {
      expect(() => parseRuntimeConfig({
        ENVIRONMENT: 'production',
        PUBLIC_BASE_URL: publicBaseUrl,
        ALLOWED_ORIGINS: 'https://creator.example.com',
      })).toThrow(RuntimeConfigError);
    }
  });

  it('accepts valid independent staging and production configuration', () => {
    const staging = parseRuntimeConfig({
      ENVIRONMENT: 'staging',
      PUBLIC_BASE_URL: 'https://abrelo-staging.example.workers.dev',
      ALLOWED_ORIGINS: 'https://creator-staging.example.com',
    });
    const production = parseRuntimeConfig({
      ENVIRONMENT: 'production',
      PUBLIC_BASE_URL: 'https://gifts.example.com',
      ALLOWED_ORIGINS: 'https://creator.example.com',
    });

    expect(staging.environment).toBe('staging');
    expect(production.environment).toBe('production');
    expect(staging.publicBaseUrl).not.toBe(production.publicBaseUrl);
  });

  it('generates canonical gift URLs from normalized server configuration', () => {
    const config = parseRuntimeConfig({
      ENVIRONMENT: 'production',
      PUBLIC_BASE_URL: 'https://gifts.example.com/',
      ALLOWED_ORIGINS: 'https://creator.example.com',
    });

    expect(createPublicGiftUrl(config, 'L8k4Pq2xR7mN9vY3sW1aFg'))
      .toBe('https://gifts.example.com/g/L8k4Pq2xR7mN9vY3sW1aFg');
  });
});
