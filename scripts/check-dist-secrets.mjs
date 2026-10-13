// Fails if the built bundle contains anything that looks like a server-side secret.
// Run after `npm run build`: `npm run check:secrets`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PATTERNS = [
  [/service_role/i, 'Supabase service role reference'],
  [/sk-ant-[a-z0-9-_]{10,}/i, 'Anthropic API key'],
  [/postgres(ql)?:\/\/[^\s"'`]+/i, 'database URL'],
  [/eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]*cm9sZSI6InNlcnZpY2Vfcm9sZS[a-zA-Z0-9_-]*/, 'service-role JWT'],
];

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let failed = false;
for (const file of walk('dist')) {
  const text = readFileSync(file, 'utf8');
  for (const [re, what] of PATTERNS) {
    if (re.test(text)) {
      console.error(`✗ ${file}: looks like a ${what}`);
      failed = true;
    }
  }
}
if (failed) process.exit(1);
console.log('✓ dist/ contains no service role key, AI key or database URL');
