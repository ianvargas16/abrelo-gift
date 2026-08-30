import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { normalizeRuntimeConfig, parseRuntimeConfig } from '../worker/runtimeConfig.js';

export const defaultWranglerConfigPath = fileURLToPath(new URL('../wrangler.jsonc', import.meta.url));
const remoteEnvironments = ['staging', 'production'];
const d1DatabaseIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export class DeploymentConfigError extends Error {
  constructor(issues) {
    super(issues.join('\n'));
    this.name = 'DeploymentConfigError';
    this.issues = issues;
  }
}

export async function loadWranglerConfig(path = defaultWranglerConfigPath) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export function getEnvironmentConfig(config, environment) {
  if (environment === 'development') {
    return config;
  }

  return config.env?.[environment];
}

function isPlaceholder(value) {
  return typeof value !== 'string'
    || value.trim() === ''
    || value === 'local'
    || /replace_with|placeholder|change_me|changeme/iu.test(value);
}

function usesReservedPlaceholderOrigin(value) {
  if (typeof value !== 'string') {
    return true;
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => {
      try {
        return new URL(entry).hostname.endsWith('.invalid');
      } catch {
        return false;
      }
    });
}

function inspectEnvironment(config, environment, { requireProvisionedResources }) {
  const issues = [];
  const target = getEnvironmentConfig(config, environment);

  if (!target || typeof target !== 'object') {
    return { issues: [`Missing Wrangler ${environment} environment configuration`] };
  }

  if (environment !== 'development') {
    for (const key of ['vars', 'd1_databases', 'r2_buckets', 'assets']) {
      if (!Object.hasOwn(target, key)) {
        issues.push(`${environment} must explicitly configure non-inheritable ${key}`);
      }
    }

    if (typeof target.name !== 'string' || !target.name.toLowerCase().includes(environment)) {
      issues.push(`${environment} Worker name must clearly identify the environment`);
    }
  }

  let runtimeConfig;

  try {
    runtimeConfig = requireProvisionedResources
      ? parseRuntimeConfig(target.vars ?? {})
      : normalizeRuntimeConfig(target.vars ?? {});

    if (runtimeConfig.environment !== environment) {
      issues.push(`${environment} ENVIRONMENT must equal ${environment}`);
    }
  } catch (error) {
    issues.push(`${environment} runtime configuration: ${error instanceof Error ? error.message : error}`);
  }

  const databases = target.d1_databases;

  if (!Array.isArray(databases) || databases.length !== 1) {
    issues.push(`${environment} must configure exactly one D1 database`);
  }

  const database = Array.isArray(databases) ? databases[0] : undefined;

  if (database?.binding !== 'DB') {
    issues.push(`${environment} D1 binding must be DB`);
  }

  if (database?.migrations_dir !== 'migrations') {
    issues.push(`${environment} D1 migrations_dir must be migrations`);
  }

  if (
    environment !== 'development'
    && (typeof database?.database_name !== 'string'
      || !database.database_name.toLowerCase().includes(environment))
  ) {
    issues.push(`${environment} D1 database_name must clearly identify the environment`);
  }

  const buckets = target.r2_buckets;

  if (!Array.isArray(buckets) || buckets.length !== 1) {
    issues.push(`${environment} must configure exactly one R2 bucket`);
  }

  const bucket = Array.isArray(buckets) ? buckets[0] : undefined;

  if (bucket?.binding !== 'GIFT_ASSETS') {
    issues.push(`${environment} R2 binding must be GIFT_ASSETS`);
  }

  if (
    typeof bucket?.bucket_name !== 'string'
    || !bucket.bucket_name.toLowerCase().includes(environment)
  ) {
    issues.push(`${environment} R2 bucket_name must clearly identify the environment`);
  }

  const assets = target.assets;

  if (
    assets?.directory !== './dist-runtime'
    || assets?.binding !== 'ASSETS'
    || !Array.isArray(assets?.run_worker_first)
    || !assets.run_worker_first.includes('/api/*')
    || !assets.run_worker_first.includes('/g/*')
  ) {
    issues.push(`${environment} must bind dist-runtime assets for /api/* and /g/*`);
  }

  if (requireProvisionedResources) {
    if (isPlaceholder(database?.database_id) || !d1DatabaseIdPattern.test(database.database_id)) {
      issues.push(`${environment} D1 database_id is missing, malformed, or still a placeholder`);
    }

    if (usesReservedPlaceholderOrigin(target.vars?.PUBLIC_BASE_URL)) {
      issues.push(`${environment} PUBLIC_BASE_URL is still a reserved placeholder origin`);
    }

    if (usesReservedPlaceholderOrigin(target.vars?.ALLOWED_ORIGINS)) {
      issues.push(`${environment} ALLOWED_ORIGINS still contains a reserved placeholder origin`);
    }

    if (isPlaceholder(bucket?.bucket_name)) {
      issues.push(`${environment} R2 bucket_name is missing or still a placeholder`);
    }
  }

  return { issues, target, database, bucket, runtimeConfig };
}

export function validateWranglerStructure(config) {
  const issues = [];
  const inspected = new Map();

  for (const environment of ['development', ...remoteEnvironments]) {
    const result = inspectEnvironment(config, environment, { requireProvisionedResources: false });
    inspected.set(environment, result);
    issues.push(...result.issues);
  }

  const staging = inspected.get('staging');
  const production = inspected.get('production');

  if (staging?.database?.database_name === production?.database?.database_name) {
    issues.push('staging and production must not share a D1 database name');
  }

  if (staging?.target?.name === production?.target?.name) {
    issues.push('staging and production must not share a Worker name');
  }

  if (staging?.database?.database_id === production?.database?.database_id) {
    issues.push('staging and production must not share a D1 database ID');
  }

  if (staging?.bucket?.bucket_name === production?.bucket?.bucket_name) {
    issues.push('staging and production must not share an R2 bucket name');
  }

  if (staging?.runtimeConfig?.publicBaseUrl === production?.runtimeConfig?.publicBaseUrl) {
    issues.push('staging and production must not share PUBLIC_BASE_URL');
  }

  const stagingAllowedOrigins = [...(staging?.runtimeConfig?.allowedOrigins ?? [])].sort();
  const productionAllowedOrigins = [...(production?.runtimeConfig?.allowedOrigins ?? [])].sort();

  if (JSON.stringify(stagingAllowedOrigins) === JSON.stringify(productionAllowedOrigins)) {
    issues.push('staging and production must not share the same ALLOWED_ORIGINS set');
  }

  const stagingConfiguration = JSON.stringify(staging?.target ?? {}).toLowerCase();
  const productionConfiguration = JSON.stringify(production?.target ?? {}).toLowerCase();

  if (stagingConfiguration.includes('production')) {
    issues.push('staging configuration must not reference production resources or origins');
  }

  if (productionConfiguration.includes('staging')) {
    issues.push('production configuration must not reference staging resources or origins');
  }

  if (issues.length > 0) {
    throw new DeploymentConfigError(issues);
  }

  return true;
}

export function validateDeploymentTarget(config, environment) {
  if (!remoteEnvironments.includes(environment)) {
    throw new DeploymentConfigError(['Deployment target must be staging or production']);
  }

  const issues = [];

  try {
    validateWranglerStructure(config);
  } catch (error) {
    if (error instanceof DeploymentConfigError) {
      issues.push(...error.issues);
    } else {
      throw error;
    }
  }

  const targetResult = inspectEnvironment(config, environment, { requireProvisionedResources: true });
  issues.push(...targetResult.issues);

  if (issues.length > 0) {
    throw new DeploymentConfigError([...new Set(issues)]);
  }

  return true;
}
