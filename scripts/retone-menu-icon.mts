// Retones the "Learn" hamburger-menu icon so it sits in the same material
// family as its six siblings in src/assets/menu-icons/ (brushed chrome-silver
// with a muted copper/bronze accent).
//
// There is no asset pipeline in this repo, so — like scripts/gen-app-icons.mts
// — this is a stand-alone script, run by hand whenever the source art changes,
// with the result committed:
//
//   npm run retone:learn     (== node scripts/retone-menu-icon.mts)
//
// The graduation-cap art arrives with a yellow-gold tassel (hue ~33 deg,
// value ~0.80) and a flat, low-contrast mortarboard. The siblings' accent
// metal is copper/bronze (hue ~20 deg, value ~0.5) over brushed chrome. This
// pass, applied over the existing raster (no re-render):
//
//   * pulls warm/saturated pixels (the tassel) toward copper: hue -> ~20 deg,
//     value x VAL_SCALE, saturation x SAT_SCALE;
//   * lifts luminance contrast on the near-grey pixels (the cap) so it reads
//     as brushed chrome rather than flat pewter;
//   * blends the two treatments by a saturation-derived weight so there is no
//     hard edge between tassel and cap, and never touches the alpha byte.
//
// Tune the constants below and re-run if the match needs nudging.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(root, 'src', 'assets', 'menu-icons', 'learn.png');

// --- warm-accent (tassel) remap ---------------------------------------------
const HUE_LO = 18;        // deg: only remap hues in this gold/orange band
const HUE_HI = 60;
const HUE_TARGET = 19;    // deg: copper/bronze the siblings use
const HUE_PULL = 0.65;    // 0..1: how far toward HUE_TARGET to move (1 = snap)
const VAL_SCALE = 0.68;   // knock the too-bright gold down (~0.80 -> ~0.54)
const SAT_SCALE = 0.88;   // ease saturation (~0.49 -> ~0.43)

// --- grey (mortarboard) contrast lift -------------------------------------
const CONTRAST = 1.13;    // luminance gain around the icon mean
const CONTRAST_MAX = 0.16; // cap the per-pixel luminance shift so nothing clips

// --- blend knee -----------------------------------------------------------
const W_LO = 0.12;        // saturation at which the warm remap starts
const W_HI = 0.24;        // ...and reaches full strength

// --- final warm-grey trim -----------------------------------------------
// The remaps above leave the cap a touch cool and dark next to the siblings
// (whose neutral sits near R>G>B ~ (150,143,138)). Nudge every opaque pixel
// back to that warm-neutral: small per-channel gain + overall lift.
const GAIN_R = 1.03;
const GAIN_G = 1.00;
const GAIN_B = 0.97;
const GAIN_ALL = 1.03;

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

const { data, info } = await sharp(TARGET)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
if (channels !== 4) throw new Error(`expected RGBA, got ${channels} channels`);

// Mean luminance of the opaque pixels — the pivot for the contrast lift.
let lumaSum = 0, opaque = 0;
for (let i = 0; i < data.length; i += 4) {
  if (data[i + 3] <= 8) continue;
  lumaSum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  opaque++;
}
const lumaMean = lumaSum / Math.max(opaque, 1) / 255;

for (let i = 0; i < data.length; i += 4) {
  const a = data[i + 3];
  if (a <= 8) continue;

  const r = data[i], g = data[i + 1], b = data[i + 2];
  let [h, s, v] = rgbToHsv(r, g, b);

  // Warm-remap weight: 0 for near-grey, 1 for saturated gold, and only inside
  // the gold/orange hue band so a stray warm-grey highlight is left alone.
  const inBand = h >= HUE_LO && h <= HUE_HI;
  const w = inBand ? clamp((s - W_LO) / (W_HI - W_LO), 0, 1) : 0;

  // (1) warm accent -> copper/bronze
  if (w > 0) {
    const hWarm = h + (HUE_TARGET - h) * HUE_PULL;
    const sWarm = s * SAT_SCALE;
    const vWarm = v * VAL_SCALE;
    h = h + (hWarm - h) * w;
    s = s + (sWarm - s) * w;
    v = v + (vWarm - v) * w;
  }

  // (2) grey mortarboard -> brushed chrome (contrast around the icon mean),
  //     faded out where the warm remap took over so the two don't fight.
  const greyW = 1 - w;
  if (greyW > 0) {
    const lifted = lumaMean + (v - lumaMean) * CONTRAST;
    const delta = clamp(lifted - v, -CONTRAST_MAX, CONTRAST_MAX) * greyW;
    v = clamp(v + delta, 0, 1);
  }

  let [nr, ng, nb] = hsvToRgb(h, s, v);
  nr *= GAIN_R * GAIN_ALL;
  ng *= GAIN_G * GAIN_ALL;
  nb *= GAIN_B * GAIN_ALL;
  data[i] = clamp(Math.round(nr), 0, 255);
  data[i + 1] = clamp(Math.round(ng), 0, 255);
  data[i + 2] = clamp(Math.round(nb), 0, 255);
  // data[i + 3] (alpha) deliberately untouched.
}

await sharp(data, { raw: { width, height, channels } }).png().toFile(TARGET);
console.log(`retoned ${TARGET}  (${width}x${height}, luma pivot ${lumaMean.toFixed(3)})`);
