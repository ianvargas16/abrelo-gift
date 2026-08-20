import { pathToFileURL } from 'node:url';

const unknownGiftId = 'A'.repeat(22);
const forbiddenRecipientMarkers = [
  'studio-',
  'preview-chrome',
  'theme-picker',
  'Publicar regalo',
  'Volver a editar',
  'GiftConfig',
];
const bootstrapPlaceholder = '<script id="abrelo-gift-data" type="application/json"></script>';

function normalizeDeploymentBaseUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error('Smoke-test URL must be a valid origin');
  }

  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal))
    || url.username
    || url.password
    || (url.pathname && url.pathname !== '/')
    || url.search
    || url.hash
  ) {
    throw new Error('Smoke-test URL must be HTTPS, or HTTP localhost, without path/query/hash');
  }

  return url.origin;
}

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function runDeploymentSmokeTest(baseUrl, options = {}) {
  const origin = normalizeDeploymentBaseUrl(baseUrl);
  const fetcher = options.fetcher ?? fetch;
  const write = options.write ?? console.log;

  const giftResponse = await fetcher(`${origin}/g/${unknownGiftId}`);
  const giftHtml = await giftResponse.text();

  requireCondition(giftResponse.status === 404, `Unknown gift returned ${giftResponse.status}, expected 404`);
  requireCondition(giftResponse.headers.get('content-type')?.includes('text/html'), 'Unknown gift must return HTML');
  requireCondition(giftResponse.headers.get('x-robots-tag')?.includes('noindex'), 'Unknown gift must be noindex');
  requireCondition(giftResponse.headers.get('referrer-policy') === 'no-referrer', 'Unknown gift must use no-referrer');
  requireCondition(giftResponse.headers.get('x-content-type-options') === 'nosniff', 'Unknown gift must use nosniff');
  requireCondition(giftResponse.headers.has('x-request-id'), 'Unknown gift must include X-Request-Id');
  requireCondition(giftHtml.includes(bootstrapPlaceholder), 'Unknown gift must serve the recipient Runtime shell');

  for (const marker of forbiddenRecipientMarkers) {
    requireCondition(!giftHtml.includes(marker), `Recipient shell contains forbidden Creator marker: ${marker}`);
  }

  const listResponse = await fetcher(`${origin}/api/gifts`);
  const listBody = await listResponse.text();

  requireCondition(listResponse.status === 405, `Gift list route returned ${listResponse.status}, expected 405`);
  requireCondition(listResponse.headers.has('x-request-id'), 'Gift list route must include X-Request-Id');
  requireCondition(!/"gift"\s*:/iu.test(listBody), 'Gift list route exposed gift data');

  const shellResponse = await fetcher(`${origin}/runtime.html`);
  const shellHtml = await shellResponse.text();
  const placeholderCount = shellHtml.split(bootstrapPlaceholder).length - 1;

  requireCondition(shellResponse.status === 200, `Runtime shell returned ${shellResponse.status}, expected 200`);
  requireCondition(shellResponse.headers.get('content-type')?.includes('text/html'), 'Runtime shell must return HTML');
  requireCondition(placeholderCount === 1, `Runtime shell bootstrap placeholder count is ${placeholderCount}, expected 1`);

  write(`Deployment smoke test passed for ${origin}.`);
  return { origin, unknownGiftStatus: giftResponse.status, listStatus: listResponse.status };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const baseUrl = process.argv[2];

  if (!baseUrl) {
    console.error('Usage: npm run smoke:deployment -- https://worker.example');
    process.exit(1);
  }

  try {
    await runDeploymentSmokeTest(baseUrl);
  } catch (error) {
    console.error(`Deployment smoke test failed: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
