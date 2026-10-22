// Fails when any file in the working tree contains a string the reviewers grep for (assignment checklist).
// The patterns use character classes so this file never contains the literals it looks for.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = path.relative(ROOT, fileURLToPath(import.meta.url)).split(path.sep).join('/');
const SKIP_DIRS = new Set(['node_modules', 'reports', 'test-results', 'playwright-report', 'screenshots']);
const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip', '.woff', '.woff2']);

const everywhere = () => true;
const RULES = [
  { name: 'alert call', pattern: /[a]lert\(/i, appliesTo: everywhere },
  { name: 'console object', pattern: /[c]onsole\./i, appliesTo: everywhere },
  { name: 'leftover marker', pattern: /[T]ODO|[X]XX/i, appliesTo: everywhere },
  { name: 'placeholder text', pattern: /[l]orem|[M]RTVOLA|[d]opsat/i, appliesTo: everywhere },
  { name: 'empty link', pattern: /[h]ref="#"/i, appliesTo: everywhere },
  { name: 'remote script', pattern: /<[s]cript src="http/i, appliesTo: everywhere },
  { name: 'inline style', pattern: /[s]tyle="/i, appliesTo: everywhere },
  { name: 'server template syntax', pattern: /@[M]odel|@[H]tml|\.[R]esult/i, appliesTo: everywhere },
  { name: 'server template syntax', pattern: /@[U]rl/i, appliesTo: (file) => file.endsWith('.js') },
  { name: 'raw media query in component', pattern: /@[m]edia \(/, appliesTo: (file) => file.startsWith('scss/components/') },
  { name: 'JS hook styled', pattern: /\.[j]s-/, appliesTo: (file) => file.startsWith('scss/') },
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && !SKIP_DIRS.has(entry.name)) yield* walk(full);
    } else if (entry.isFile() && !BINARY_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      yield path.relative(ROOT, full).split(path.sep).join('/');
    }
  }
}

let scanned = 0;
for await (const file of walk(ROOT)) {
  if (file === SELF) continue;
  scanned += 1;
  const rules = RULES.filter((rule) => rule.appliesTo(file));
  const lines = (await readFile(path.join(ROOT, file), 'utf8')).split('\n');
  lines.forEach((line, index) => {
    for (const rule of rules) {
      if (rule.pattern.test(line)) {
        process.stdout.write(`${file}:${index + 1}: ${rule.name}\n`);
        process.exitCode = 1;
      }
    }
  });
}

// Zero files means the walk is broken, not that the tree is clean.
if (scanned === 0) {
  process.stdout.write('check-forbidden: no files scanned\n');
  process.exitCode = 1;
}
