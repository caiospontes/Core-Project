import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const includeDirs = ['src'];
const includeFiles = ['index.html', 'package.json', 'vite.config.js'];
const skipDirs = new Set(['node_modules', '.git', 'dist', '.vercel']);
const conflictRegex = /^(<{7}|={7}|>{7})/m;

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) yield* walk(full);
      continue;
    }
    yield full;
  }
}

const targets = [];
for (const d of includeDirs) {
  const full = path.join(root, d);
  if (fs.existsSync(full)) {
    for (const file of walk(full)) targets.push(file);
  }
}
for (const f of includeFiles) {
  const full = path.join(root, f);
  if (fs.existsSync(full)) targets.push(full);
}

const conflicted = [];
for (const file of targets) {
  const content = fs.readFileSync(file, 'utf8');
  if (conflictRegex.test(content)) conflicted.push(path.relative(root, file));
}

if (conflicted.length) {
  console.error('❌ Merge conflicts detectados nos arquivos abaixo:');
  conflicted.forEach((f) => console.error(` - ${f}`));
  console.error('\nResolva os marcadores <<<<<<<, =======, >>>>>>> antes do build/deploy.');
  process.exit(1);
}

console.log('✅ Nenhum marcador de conflito encontrado.');
