// Folds the web build (dist-web/) into one self-contained HTML file: scripts, styles and fonts inline.
// Usage: npm run build:single  →  dist-web/memory-worlds.html (open it from disk or host it anywhere).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = 'dist-web';
const html = readFileSync(join(root, 'index.html'), 'utf8');
const mime = { woff2: 'font/woff2', woff: 'font/woff', png: 'image/png', svg: 'image/svg+xml', wav: 'audio/wav', mp3: 'audio/mpeg' };

function inlineUrls(css, base) {
  return css.replace(/url\((?!data:)(['"]?)([^)'"]+)\1\)/g, (match, _quote, path) => {
    const type = mime[path.split('.').pop()];
    if (!type) return match;
    return `url(data:${type};base64,${readFileSync(join(base, path)).toString('base64')})`;
  });
}

let out = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g, (_, path) => {
  const css = inlineUrls(readFileSync(join(root, path), 'utf8'), join(root, dirname(path)));
  return `<style>${css}</style>`;
});
out = out.replace(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g, (_, path) => {
  const js = readFileSync(join(root, path), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
if (/(?:src|href)="\.\/assets\//.test(out)) throw new Error('An asset reference was not inlined.');
writeFileSync(join(root, 'memory-worlds.html'), out);
console.log(`dist-web/memory-worlds.html: ${(out.length / 1024 / 1024).toFixed(2)} MB`);
