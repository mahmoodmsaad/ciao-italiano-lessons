/**
 * Folds the `--mode singlefile` build into ONE self-contained .html file.
 *
 * The result needs no server, no install and no internet: double-click it, or
 * upload it to any static host. Run it with `npm run build:single`.
 */
import { readFile, writeFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist-single');
const out = join(dist, 'elibrary-app.html');

// A literal </script> or </style> inside the inlined text would close the tag early.
const safe = (text, tag) => text.replaceAll(`</${tag}`, `<\\/${tag}`);

const [html, css, js] = await Promise.all([
  readFile(join(dist, 'index.html'), 'utf8'),
  readFile(join(dist, 'app.css'), 'utf8'),
  readFile(join(dist, 'app.js'), 'utf8'),
]);

// Two things to get right here.
//
// The replacements must be FUNCTIONS: a minified bundle is full of $& and $1,
// which String.replace would otherwise expand as backreferences.
//
// And the bundle moves to the END OF BODY. Vite emits it as <script type="module">
// in <head>, which browsers defer automatically - but a module script is blocked on
// a file:// URL, so it has to become a classic script, and a classic script in <head>
// would run before <div id="root"> exists.
const inlined = html
  .replace(/\s*<link rel="stylesheet"[^>]*href="[^"]*app\.css"[^>]*>/, () => `\n    <style>${safe(css, 'style')}</style>`)
  .replace(/\s*<script[^>]*src="[^"]*app\.js"[^>]*><\/script>/, '')
  .replace('</body>', () => `  <script>${safe(js, 'script')}</script>\n  </body>`);

for (const [what, pattern] of [['stylesheet', 'app.css'], ['script', 'app.js']]) {
  if (inlined.includes(pattern)) {
    console.error(`[single-file] The ${what} was not inlined - "${pattern}" is still referenced.`);
    process.exit(1);
  }
}

await writeFile(out, inlined);
await Promise.all([
  rm(join(dist, 'index.html'), { force: true }),
  rm(join(dist, 'app.css'), { force: true }),
  rm(join(dist, 'app.js'), { force: true }),
]);

const kb = (Buffer.byteLength(inlined) / 1024).toFixed(0);
console.log(`\n[single-file] ${out}  (${kb} KB)`);
console.log('[single-file] One file, no server needed. Double-click it, or upload it anywhere.\n');
