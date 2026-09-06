// Regenerates every app-icon / splash raster from a single master image
// (assets/note-mark.png — the metallic guitar-note mark, transparent bg).
//
// There is no test runner or asset pipeline in this repo, so this is a
// stand-alone script in the same spirit as the other scripts/*.mts — run by
// hand whenever the master art changes, and commit the results:
//
//   npm run gen:icons        (== node scripts/gen-app-icons.mts)
//
// It writes two families of files:
//   1. public/*   — the web / PWA icons and the boot-splash mark. These are
//      committed so `npm run build` never needs an image library.
//   2. assets/*   — the source art for `capacitor-assets generate`, which the
//      Android APK workflow runs to produce native mipmaps / adaptive icons /
//      splash screens into the (gitignored) android/ project.
//
// The mark is composited over a subtle vertical gradient that matches the
// hamburger drawer palette (--bg-0 #1a1a2e at the top → --bg-1 #111122 at the
// bottom); the web boot-splash progress bar reuses the same cyan --accent.

import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MASTER = join(root, 'assets', 'note-mark.png');

const GRAD_TOP = '#1a1a2e';    // --bg-0
const GRAD_BOTTOM = '#111122'; // --bg-1

/** A size×size PNG buffer of the vertical drawer-palette gradient. */
function gradient(size: number): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GRAD_TOP}"/>
      <stop offset="1" stop-color="${GRAD_BOTTOM}"/>
    </linearGradient></defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** The master mark, trimmed of its transparent border, scaled so its longest
 *  side is `px` pixels. Returned as a PNG buffer with alpha intact. */
function mark(px: number): Promise<Buffer> {
  return sharp(MASTER)
    .trim()
    .resize(px, px, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();
}

/** Mark centred over the gradient. `coverage` is the mark's longest side as a
 *  fraction of the canvas (the rest is breathing room / mask safe-zone). */
async function onGradient(size: number, coverage: number, out: string): Promise<void> {
  const bg = await gradient(size);
  const fg = await mark(Math.round(size * coverage));
  await sharp(bg)
    .composite([{ input: fg, gravity: 'center' }])
    .png()
    .toFile(join(root, out));
  console.log(`  ${out}  (${size}px, mark ${Math.round(coverage * 100)}%)`);
}

/** Just the trimmed mark on transparency, longest side `size`. */
async function transparent(size: number, out: string): Promise<void> {
  await sharp(await mark(size)).png().toFile(join(root, out));
  console.log(`  ${out}  (${size}px, transparent)`);
}

async function solid(size: number, out: string): Promise<void> {
  await sharp(await gradient(size)).png().toFile(join(root, out));
  console.log(`  ${out}  (${size}px, gradient only)`);
}

await mkdir(join(root, 'public'), { recursive: true });
await mkdir(join(root, 'assets'), { recursive: true });

console.log('web / PWA (committed to public/):');
// Home-screen / install icons: generous mark, small inset so it never kisses
// the edge.
await onGradient(192, 0.78, 'public/icon-192.png');
await onGradient(512, 0.78, 'public/icon-512.png');
// Maskable: platforms crop to a circle/squircle, keep the mark inside the
// ~80% safe zone (→ 0.6 of the full canvas).
await onGradient(512, 0.6, 'public/icon-maskable-512.png');
// iOS already rounds the corners of apple-touch-icon itself.
await onGradient(180, 0.8, 'public/apple-touch-icon.png');
// The web boot-splash paints its own CSS gradient behind this mark.
await transparent(640, 'public/splash-mark.png');

console.log('native source art (for capacitor-assets, in assets/):');
await onGradient(1024, 0.78, 'assets/icon-only.png');
// Android adaptive icon: the launcher masks and zooms (~1.4x) the foreground
// layer, so the mark sits small on a full 1024 transparent canvas to survive
// the crop.
await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: await mark(600), gravity: 'center' }])
  .png()
  .toFile(join(root, 'assets/icon-foreground.png'));
console.log('  assets/icon-foreground.png  (1024px canvas, 600px mark)');
await solid(1024, 'assets/icon-background.png');
// Splash: 2732² is the capacitor-assets canonical source size. Keep the mark
// small — only the centre ~1200px is guaranteed visible on every device.
await onGradient(2732, 0.3, 'assets/splash.png');
await onGradient(2732, 0.3, 'assets/splash-dark.png');

console.log('done.');
