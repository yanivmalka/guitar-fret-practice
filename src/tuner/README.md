# Tuner prototype

A standalone chromatic tuner, built in isolation from the rest of the app so
it can be developed and tested before being wired in. Nothing here imports
from outside `src/tuner/`, and nothing outside `src/tuner/` imports from here
yet.

Run it with `npm run dev` and open `/tuner.html` (e.g.
`http://localhost:5173/tuner.html`).

## Pieces

- `pitchDetect.ts` — pure pitch-detection algorithm (autocorrelation +
  parabolic interpolation) over a `Float32Array` of time-domain samples. No
  Web Audio dependency; testable on its own.
- `noteUtils.ts` — frequency ⇄ note name/octave/cents math (12-TET, A4=440).
  Deliberately separate from `src/utils/music.ts`.
- `useTuner.ts` — owns `getUserMedia` + the `AudioContext`/`AnalyserNode`
  graph and runs the detection loop on `requestAnimationFrame`.
- `Tuner.tsx` — bare, undesigned UI: note name, cents offset, a plain
  start/stop button. Good enough to verify detection works; not meant to
  ship as-is.

## Known scope left for the integration pass

- No design/theming — plain default HTML styling.
- No i18n (`t()` calls) yet.
- No tier gating decision made yet (free vs Pro/Premium).
- No Capacitor/native mic-permission handling beyond the browser
  `getUserMedia` prompt (the app already declares `RECORD_AUDIO` for the
  speech-recognition plugin, which the tuner can likely reuse once merged).
- Not added to any nav/menu; only reachable directly via `/tuner.html`.
