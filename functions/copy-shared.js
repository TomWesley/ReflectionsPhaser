/**
 * Copies the repo's shared /js tree into functions/js so the Cloud Functions can
 * import the exact same physics, verifier, and puzzle-generator code the browser
 * uses. Firebase only deploys the functions/ directory, so the shared code must
 * live inside it. This runs before every emulate and every deploy (predeploy hook).
 *
 * functions/js is git-ignored — it is always a fresh copy, never edited by hand.
 */
import { cpSync, rmSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'js');
const dest = join(here, 'js');

if (!existsSync(src)) {
    console.error(`copy-shared: source not found at ${src}`);
    process.exit(1);
}

if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`copy-shared: copied ${src} -> ${dest}`);
