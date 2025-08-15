// ESM-friendly deploy script for GitHub Pages
// Publishes ./dist to the gh-pages branch without using the gh-pages package

import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = __dirname;
const DIST = resolve(ROOT, 'dist');

const run = (cmd, cwd = ROOT) => execSync(cmd, { stdio: 'inherit', cwd });

try {
  // Get repo URL from current repo
  const originUrl = execSync('git config --get remote.origin.url', { cwd: ROOT })
    .toString()
    .trim();
  if (!originUrl) throw new Error('No se encontró remote.origin.url. Configura el remoto con: git remote add origin <URL>');

  // Ensure .nojekyll to allow files like _assets
  writeFileSync(resolve(DIST, '.nojekyll'), '');

  // Initialize a temporary repo inside dist and push force to gh-pages
  run('git init', DIST);
  run('git add -A', DIST);
  run('git commit -m "deploy"', DIST);
  run('git branch -M gh-pages', DIST);
  // Set origin to same as root repo
  run(`git remote add origin ${originUrl}`, DIST);
  // Force push
  run('git push -f origin gh-pages', DIST);

  console.log('\n✅ Deploy completado en la rama gh-pages');
} catch (err) {
  console.error('\n❌ Error en deploy:', err?.message || err);
  process.exit(1);
}



