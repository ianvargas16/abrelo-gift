import {
  DeploymentConfigError,
  loadWranglerConfig,
  validateDeploymentTarget,
  validateWranglerStructure,
} from './deploymentConfig.mjs';

const target = process.argv[2];

try {
  const config = await loadWranglerConfig();

  if (target === 'structure') {
    validateWranglerStructure(config);
    console.log('Wrangler environment structure is valid.');
  } else if (target === 'staging' || target === 'production') {
    validateDeploymentTarget(config, target);
    console.log(`${target} deployment configuration is ready.`);
  } else {
    throw new DeploymentConfigError(['Expected structure, staging, or production']);
  }
} catch (error) {
  console.error('Deployment configuration validation failed:');

  if (error instanceof DeploymentConfigError) {
    error.issues.forEach((issue) => console.error(`- ${issue}`));
  } else {
    console.error(`- ${error instanceof Error ? error.message : error}`);
  }

  process.exit(1);
}
