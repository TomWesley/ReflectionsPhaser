/** build-gallery.mjs — inline results.json into the gallery template. */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const tpl = readFileSync(join(HERE, 'gallery.template.html'), 'utf8');
const data = readFileSync(join(HERE, 'results.json'), 'utf8');
const out = tpl.replace('__DATA__', data);
const outPath = join(HERE, 'gallery.html');
writeFileSync(outPath, out);
console.log(`Wrote ${outPath} (${(out.length / 1024).toFixed(0)} KB)`);
