import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = fileURLToPath(new URL('../dist-runtime/', import.meta.url));
const runtimeHtmlPath = join(outputDirectory, 'runtime.html');
const bootstrapPlaceholder = '<script id="abrelo-gift-data" type="application/json"></script>';
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map']);
const forbiddenMarkers = [
  'studio-',
  'theme-picker',
  'theme-choice',
  'preview-chrome',
  'preview-status',
  'preview-badge',
  '.field',
  'file-button',
  'primary-button',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  '@tauri-apps',
  'localStorage',
  'abrelo.projects',
  'giftTemplates',
];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));

  return files.flat();
}

let files;

try {
  files = (await listFiles(outputDirectory)).filter((file) => textExtensions.has(extname(file)));
} catch (error) {
  console.error('Runtime bundle is missing. Run npm run build:runtime first.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const violations = [];

try {
  const runtimeHtml = await readFile(runtimeHtmlPath, 'utf8');
  const placeholderCount = runtimeHtml.split(bootstrapPlaceholder).length - 1;

  if (placeholderCount !== 1) {
    violations.push(`runtime.html must contain the gift bootstrap placeholder exactly once (found ${placeholderCount})`);
  }
} catch (error) {
  violations.push(`runtime.html could not be read: ${error instanceof Error ? error.message : error}`);
}

for (const file of files) {
  const contents = await readFile(file, 'utf8');

  for (const marker of forbiddenMarkers) {
    if (contents.includes(marker)) {
      violations.push(`${relative(outputDirectory, file)} contains "${marker}"`);
    }
  }
}

if (violations.length > 0) {
  console.error('Recipient Runtime bundle boundary check failed:');
  violations.forEach((violation) => console.error(`- ${violation}`));
  process.exit(1);
}

console.log(`Recipient Runtime bundle boundary check passed (${files.length} files inspected).`);
