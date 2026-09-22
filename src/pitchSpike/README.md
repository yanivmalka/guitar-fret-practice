# Pitch-answer spike

A throwaway measurement tool for the guitar-audio question in
`.kiro/specs/roadmap/premium-product-plan.md` §7 ("Learning by playing the
guitar"). It is **not** the "play the note" answer modality itself — it
exists only to gather real numbers, on a real device, before that plan's
required go/no-go decision is made. Until that decision is written down,
guitar-audio is not a roadmap commitment.

Run it with `npm run dev` and open `/pitch-spike.html` (e.g.
`http://localhost:5173/pitch-spike.html`). Nothing here is wired into the
real app, the real drill engine, or any navigation.

## What it does

Shows a random guitar note (frets 0-12, standard tuning — matches the app's
free "Dots" difficulty range). You play it; the existing tuner pitch
detector (`src/tuner/pitchDetect.ts`, reused as-is) listens and, once it
sees a stable match, records:

- **latency** — ms from the prompt appearing to a confirmed match
- **pitch-class accuracy** — did it recognize the right note at all
- **octave accuracy** — did it recognize the right *octave*, separately
  (low strings are the classic octave-doubling failure case)
- **clarity** — the detector's own confidence score
- **timeouts** — no stable match within 6s

Toggle "Noisy room" to tag a batch of attempts so quiet-room and
noisy-room results don't get blended together — a quiet-room-only result
must be reported as "noise behaviour unmeasured", not "works"
(`voice-must-work-in-background-noise`).

"Copy log as JSON" exports every attempt for the write-up below.

## What the go/no-go needs

Per the plan, this must be measured on a real device in a real (noisy) room
before any conclusion is drawn. Before writing the go/no-go, collect at
least ~30 attempts in a quiet room and ~30 in a normal noisy room (traffic,
talk, the app's own note-playback sound if applicable), covering low, mid
and high strings, and answer:

- Does accuracy and latency hold up with normal background noise, or only
  in silence?
- Is octave-doubling on the low strings (E2/A2/D3) common enough to need a
  fix, or workable as-is?
- Is latency low enough to feel responsive (target ~150ms) once a real hold
  requirement is applied?
- Any electric vs. acoustic / pickup vs. room-mic difference worth noting?

Write the conclusion (go / no-go / go-with-caveats) into
`product-wishlist.md` next to the existing "Real pitch detection from the
microphone" entry, and update `premium-product-plan.md` §7/§11 to reflect
it. Only after a "go" should this turn into the real Premium answer
modality described in §7 (items 2-5).
