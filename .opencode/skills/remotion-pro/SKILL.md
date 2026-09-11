---
name: remotion-pro
description: Professional Remotion video engineering — spring/bezier choreography, 5-layer composition, Ken Burns, captions, CLI render and visual verification loop. Use when creating or editing Remotion videos, animations, ShortVideo/LongVideo components, or rendering video in this repo.
---

# Remotion Pro

Expert rules for producing broadcast-quality programmatic video with Remotion v4 in this repo (`remotion/`: compositions `ShortVideo`, `LongVideo`; render via `npx remotion render`; data-driven via `remotion/video-data.json`).

## 1. Choreography & timing (never linear)

- **Non-linear interpolation only.** Pure linear motion looks amateur. Use `spring()` (real spring physics) for entrances/emphasis and `interpolate()` with `extrapolateLeft: "clamp"` (and `extrapolateRight: "clamp"` when the value must not overshoot) plus easing curves (`Easing.bezier(...)`, `Easing.out(Easing.exp)`, etc.).
- **Multi-property entrances.** Every entrance combines at least opacity + translateY + scale (e.g. `opacity 0→1`, `translateY 40→0`, `scale 0.94→1` on the same spring clock) — never a lone fade.
- **Staggering.** Lists/grids animate with a systematic 3–6 frame delay between items (`delay + i * 4`), creating visual rhythm. Derive all siblings from one base frame.
- All timing derives from `useCurrentFrame()` + `fps`; never hardcode seconds-to-frames conversions inline — compute `const t = frame / fps`.

## 2. Screen composition & layout structure

- **Minimum 5 stacked layers**, in this order:
  1. Background / mesh gradient (never leave transparency)
  2. Asset elements (product images, footage)
  3. Graphics (titles, badges, lower-thirds, progress bars)
  4. Color grading (subtle overlay: contrast/vignette-grade `AbsoluteFill`)
  5. Grain/vignette overlay (film grain + edge vignette, low opacity)
- **Idle micro-movements.** Nothing stays fully static: sine-based breathing/floating (`Math.sin(frame * speed + phase) * amplitude`) on heroes, badges and backgrounds.
- **`AbsoluteFill` mastery.** Every composition root and every full-screen layer uses `AbsoluteFill`. A black frame is always treated as a missing-background bug, never as acceptable output.

## 3. Media & audio

- **Ken Burns on stills.** Every static image gets slow zoom + pan (`interpolate` over its visible window, e.g. `scale 1→1.12` with slight x drift). No frozen photos.
- **`OffthreadVideo` for footage.** Real video footage renders through `OffthreadVideo` (separate thread), never plain `<video>`, for smooth CI renders.
- **Frame-accurate captions (`@remotion/captions`).** Dynamic captions styled per-word (highlight color, kinetic scale spring on the active word). If the package is not installed, implement the equivalent word-timing render from SRT/JSON timings — never burn static subtitle images.
- Audio hierarchy: narration bed → music ducked under voice → SFX accents on transitions. Never let music mask the voice.

## 4. Repo pipeline (CI/CD & verification)

- **Render via CLI from `remotion/`:** `npx remotion render ShortVideo out/<slug>.mp4` (vertical) or `LongVideo` (horizontal). Props flow through `video-data.json` + `defaultProps` in `Root.tsx` — the worker (`scripts/remotion-worker.mjs`) rewrites that file per job before rendering.
- **ffmpeg inspection/export:** probe with `ffprobe` (streams, duration, fps) and extract stills for review: `ffmpeg -y -ss <t> -i out/<slug>.mp4 -frames:v 1 -update 1 -q:v 3 /tmp/check.jpg`.
- **Visual verification loop (mandatory).** A task is NOT done when the render exits 0: extract frames at ~10%, 50%, 90% of duration, Read each image, and confirm: no black frames, background present on all 5 layers, text inside safe margins, captions visible when speech is active. Only then mark complete.
- **Remotion Lambda (scale).** For batch/parallel renders, orchestrate via `@remotion/lambda` (deploy function + `renderMediaOnLambda`) from GitHub Actions — renders in seconds instead of minutes. Keep the local CLI path as fallback.

## 5. Definition of done (checklist)

1. Zero linear-only animations (springs/easings everywhere).
2. 5 layers present; no `AbsoluteFill` gaps.
3. Idle motion on all persistent elements.
4. Ken Burns on every still; `OffthreadVideo` for footage.
5. Captions frame-synced and styled.
6. Render exits 0 AND 10/50/90% stills visually inspected.
