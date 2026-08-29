import { describe, expect, it } from 'vitest';
import {
  DeploymentConfigError,
  loadWranglerConfig,
  validateDeploymentTarget,
  validateWranglerStructure,
} from './deploymentConfig.mjs';

const assets = () => ({
  directory: './dist-runtime',
  binding: 'ASSETS',
  run_worker_first: ['/api/*', '/g/*'],
});

function database(name, id) {
  return [{
    binding: 'DB',
    database_name: name,
    database_id: id,
    migrations_dir: 'migrations',
  }];
}

function assetsBucket(name) {
  return [{
    binding: 'GIFT_ASSETS',
    bucket_name: name,
  }];
}

function createReadyConfig() {
  return {
    name: 'abrelo-publish-development',
    assets: assets(),
    d1_databases: database('abrelo-published-gifts', 'local'),
    r2_buckets: assetsBucket('abrelo-gift-assets-development'),
    vars: {
      ENVIRONMENT: 'development',
      PUBLIC_BASE_URL: 'http://127.0.0.1:8787',
      ALLOWED_ORIGINS: 'http://localhost:1420',
    },
    env: {
      staging: {
        name: 'abrelo-publish-staging',
        assets: assets(),
        d1_databases: database('abrelo-published-gifts-staging', '11111111-1111-4111-8111-111111111111'),
        r2_buckets: assetsBucket('abrelo-gift-assets-staging'),
        vars: {
          ENVIRONMENT: 'staging',
          PUBLIC_BASE_URL: 'https://abrelo-staging.example.workers.dev',
          ALLOWED_ORIGINS: 'https://creator-staging.example.com',
        },
      },
      production: {
        name: 'abrelo-publish-production',
        assets: assets(),
        d1_databases: database('abrelo-published-gifts-production', '22222222-2222-4222-8222-222222222222'),
        r2_buckets: assetsBucket('abrelo-gift-assets-production'),
        vars: {
          ENVIRONMENT: 'production',
          PUBLIC_BASE_URL: 'https://gifts.example.com',
          ALLOWED_ORIGINS: 'https://creator.example.com',
        },
      },
    },
  };
}

describe('deployment configuration preflight', () => {
  it('accepts a fully separated staging and production fixture', () => {
    const config = createReadyConfig();

    expect(validateWranglerStructure(config)).toBe(true);
    expect(validateDeploymentTarget(config, 'staging')).toBe(true);
    expect(validateDeploymentTarget(config, 'production')).toBe(true);
  });

  it('accepts provisioned repository staging while production remains blocked', async () => {
    const config = await loadWranglerConfig();

    expect(validateWranglerStructure(config)).toBe(true);
    expect(validateDeploymentTarget(config, 'staging')).toBe(true);
    expect(config.env.staging.vars.ALLOWED_ORIGINS.split(',')).toEqual([
      'https://abrelo-creator-staging.pages.dev',
      'https://33dee5dd.abrelo-creator-staging.pages.dev',
    ]);
    expect(() => validateDeploymentTarget(config, 'production')).toThrow(DeploymentConfigError);
  });

  it('rejects unresolved staging resources in a synthetic configuration', () => {
    const config = createReadyConfig();
    config.env.staging.d1_databases[0].database_id = 'REPLACE_WITH_STAGING_D1_DATABASE_ID';
    config.env.staging.vars.PUBLIC_BASE_URL = 'https://staging.example.invalid';
    config.env.staging.vars.ALLOWED_ORIGINS = 'https://creator-staging.example.invalid';

    expect(() => validateDeploymentTarget(config, 'staging')).toThrow(DeploymentConfigError);
  });

  it('rejects an inherited or missing remote binding', () => {
    const config = createReadyConfig();
    delete config.env.production.d1_databases;

    expect(() => validateWranglerStructure(config)).toThrow(/explicitly configure non-inheritable d1_databases/u);
  });

  it('rejects a missing remote R2 binding', () => {
    const config = createReadyConfig();
    delete config.env.production.r2_buckets;

    expect(() => validateWranglerStructure(config)).toThrow(/explicitly configure non-inheritable r2_buckets/u);
  });

  it('rejects staging and production database reuse', () => {
    const config = createReadyConfig();
    config.env.production.d1_databases[0].database_id = '11111111-1111-4111-8111-111111111111';

    expect(() => validateWranglerStructure(config)).toThrow(/must not share a D1 database ID/u);
  });

  it('rejects staging and production R2 bucket reuse', () => {
    const config = createReadyConfig();
    config.env.production.r2_buckets[0].bucket_name = 'abrelo-gift-assets-staging';

    expect(() => validateWranglerStructure(config)).toThrow(/must not share an R2 bucket name/u);
  });

  it('rejects reuse of the same normalized remote Creator origins', () => {
    const config = createReadyConfig();
    config.env.production.vars.ALLOWED_ORIGINS = 'https://creator-staging.example.com/';

    expect(() => validateWranglerStructure(config)).toThrow(/must not share the same ALLOWED_ORIGINS set/u);
  });

  it('compares normalized remote Creator origin sets without depending on order', () => {
    const config = createReadyConfig();
    config.env.staging.vars.ALLOWED_ORIGINS = 'https://a.example.com, https://b.example.com';
    config.env.production.vars.ALLOWED_ORIGINS = 'https://b.example.com/, https://a.example.com';

    expect(() => validateWranglerStructure(config)).toThrow(/must not share the same ALLOWED_ORIGINS set/u);
  });

  it('rejects dangerous production runtime values through the shared parser', () => {
    const config = createReadyConfig();
    config.env.production.vars.PUBLIC_BASE_URL = 'http://127.0.0.1:8787';
    config.env.production.vars.ALLOWED_ORIGINS = '*';

    expect(() => validateDeploymentTarget(config, 'production')).toThrow(/production runtime configuration/u);
  });
});
