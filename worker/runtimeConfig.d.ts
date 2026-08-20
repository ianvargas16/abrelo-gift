export const WORKER_ENVIRONMENTS: readonly ['development', 'staging', 'production'];

export type WorkerEnvironment = (typeof WORKER_ENVIRONMENTS)[number];

export interface RawRuntimeConfig {
  ENVIRONMENT?: unknown;
  PUBLIC_BASE_URL?: unknown;
  ALLOWED_ORIGINS?: unknown;
}

export interface RuntimeConfig {
  environment: WorkerEnvironment;
  publicBaseUrl: string;
  allowedOrigins: readonly string[];
}

export class RuntimeConfigError extends Error {}

export function normalizePublicBaseUrl(
  value: unknown,
  environment: WorkerEnvironment,
): string;

export function normalizeAllowedOrigins(
  value: unknown,
  environment: WorkerEnvironment,
): readonly string[];

export function parseRuntimeConfig(rawConfig: RawRuntimeConfig): RuntimeConfig;
export function createPublicGiftUrl(config: RuntimeConfig, id: string): string;
