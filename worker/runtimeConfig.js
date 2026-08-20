// @ts-check

export const WORKER_ENVIRONMENTS = ['development', 'staging', 'production'];

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', 'tauri.localhost']);

/** @param {string} hostname */
function isReservedPlaceholderHostname(hostname) {
  return hostname === 'invalid' || hostname.endsWith('.invalid');
}

export class RuntimeConfigError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'RuntimeConfigError';
  }
}

/** @param {unknown} value */
function parseEnvironment(value) {
  if (typeof value !== 'string' || !WORKER_ENVIRONMENTS.includes(value)) {
    throw new RuntimeConfigError('ENVIRONMENT must be development, staging, or production');
  }

  return value;
}

/**
 * @param {unknown} value
 * @param {string} name
 */
function requireConfigString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RuntimeConfigError(`${name} is required`);
  }

  return value.trim();
}

/**
 * @param {URL} url
 * @param {string} name
 */
function assertOriginShape(url, name) {
  if (url.username || url.password) {
    throw new RuntimeConfigError(`${name} must not contain credentials`);
  }

  if ((url.pathname && url.pathname !== '/') || url.search || url.hash) {
    throw new RuntimeConfigError(`${name} must be an origin without path, query, or hash`);
  }
}

/**
 * @param {unknown} value
 * @param {string} name
 */
function parseUrl(value, name) {
  const rawValue = requireConfigString(value, name);

  if (rawValue.includes('*')) {
    throw new RuntimeConfigError(`${name} must not contain wildcards`);
  }

  let url;

  try {
    url = new URL(rawValue);
  } catch {
    throw new RuntimeConfigError(`${name} must be a valid URL origin`);
  }

  assertOriginShape(url, name);
  return { rawValue, url };
}

/**
 * @param {URL} url
 * @param {string} environment
 * @param {string} name
 */
function assertWebProtocol(url, environment, name) {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new RuntimeConfigError(`${name} must use HTTP or HTTPS`);
  }

  const isLocal = LOCAL_HOSTNAMES.has(url.hostname);

  if (environment !== 'development' && (url.protocol !== 'https:' || isLocal)) {
    throw new RuntimeConfigError(`${name} must use a non-local HTTPS origin outside development`);
  }

  if (url.protocol === 'http:' && !isLocal) {
    throw new RuntimeConfigError(`${name} may use HTTP only for local development origins`);
  }
}

/**
 * @param {unknown} value
 * @param {string} environment
 */
export function normalizePublicBaseUrl(value, environment) {
  const { url } = parseUrl(value, 'PUBLIC_BASE_URL');
  assertWebProtocol(url, environment, 'PUBLIC_BASE_URL');
  return url.origin;
}

/**
 * @param {string} value
 * @param {string} environment
 */
function normalizeAllowedOrigin(value, environment) {
  const { url } = parseUrl(value, 'ALLOWED_ORIGINS');

  if (url.protocol === 'tauri:') {
    if (environment !== 'development' || url.hostname !== 'localhost') {
      throw new RuntimeConfigError('ALLOWED_ORIGINS may use tauri://localhost only in development');
    }

    return 'tauri://localhost';
  }

  assertWebProtocol(url, environment, 'ALLOWED_ORIGINS');
  return url.origin;
}

/**
 * @param {unknown} value
 * @param {string} environment
 */
export function normalizeAllowedOrigins(value, environment) {
  const configuredValue = requireConfigString(value, 'ALLOWED_ORIGINS');
  const entries = configuredValue
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    throw new RuntimeConfigError('ALLOWED_ORIGINS must contain at least one origin');
  }

  return [...new Set(entries.map((entry) => normalizeAllowedOrigin(entry, environment)))];
}

/** @param {{ ENVIRONMENT?: unknown, PUBLIC_BASE_URL?: unknown, ALLOWED_ORIGINS?: unknown }} rawConfig */
export function normalizeRuntimeConfig(rawConfig) {
  const environment = parseEnvironment(rawConfig.ENVIRONMENT);

  return {
    environment,
    publicBaseUrl: normalizePublicBaseUrl(rawConfig.PUBLIC_BASE_URL, environment),
    allowedOrigins: normalizeAllowedOrigins(rawConfig.ALLOWED_ORIGINS, environment),
  };
}

/** @param {{ environment: string, publicBaseUrl: string, allowedOrigins: readonly string[] }} config */
export function assertRuntimeConfigReady(config) {
  if (config.environment === 'development') {
    return;
  }

  const configuredOrigins = [config.publicBaseUrl, ...config.allowedOrigins];

  if (configuredOrigins.some((origin) => isReservedPlaceholderHostname(new URL(origin).hostname))) {
    throw new RuntimeConfigError('Remote runtime configuration contains a reserved placeholder origin');
  }
}

/** @param {{ ENVIRONMENT?: unknown, PUBLIC_BASE_URL?: unknown, ALLOWED_ORIGINS?: unknown }} rawConfig */
export function parseRuntimeConfig(rawConfig) {
  const config = normalizeRuntimeConfig(rawConfig);
  assertRuntimeConfigReady(config);
  return config;
}

/**
 * @param {{ publicBaseUrl: string }} config
 * @param {string} id
 */
export function createPublicGiftUrl(config, id) {
  return new URL(`/g/${encodeURIComponent(id)}`, `${config.publicBaseUrl}/`).toString();
}
