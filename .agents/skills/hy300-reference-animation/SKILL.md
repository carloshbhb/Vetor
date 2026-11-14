---
name: hy300-reference-animation
description: Product Shorts with expressive 2D character acting, tactile paper-collage cut-outs, reference-led timing and frame-by-frame visual QA.
---

# HY300 reference-animation

## Isolation
- Work only on `test/hy300-reference-animation`.
- Never change `main`, the existing production video workflows, queue worker, Supabase logic, existing Remotion compositions, daily quota or Vercel deployment.
- Keep Remotion as the rendering engine. Add a separate composition and a dedicated pilot workflow.
- Publish only this pilot after render validation and a successful OAuth check against the existing Vercel Production token source.

## Visual direction
- The reference combines expressive hand-drawn 2D character performance with tactile paper collage. Do not reduce it to static title cards.
- Every beat needs a visible action and reaction: anticipate, act, impact, respond, then hold the meaning long enough to read.
- Give the mascot distinct poses and expressions (walk, stop, point, flinch, hop, gesture, cheer). Avoid one repetitive bob loop.
- Combine real product photography with paper surfaces: halftone, torn paper, marker arrows, scraps, physical labels and restrained shadows. Never pretend an opaque photo is a transparent cut-out.
- Create depth using background, midground and foreground. Parallax supports the action; it does not replace it.
- One clear focal action per beat. Avoid disconnected cards, fake dashboards and unnecessary UI decoration.
- Keep on-screen wording short. Spoken narration carries the detail.
- The climax must distinguish accepting a 4K input signal from native 1024 × 768 resolution for the consulted offer.
- Qualify claims to the exact listing consulted; seller and version specifications may differ.

## Animation and timing
- Portrait 1080 × 1920, 24 fps. Character and paper drawings change on twos (12 drawings/second); camera and travelling paper may move smoothly where it helps the story.
- Props arrive with a sharp slap/overshoot and settle. Text chips arrive in sequence.
- Use anticipation, squash/stretch, overlapping limbs, facial acting, blink and secondary motion.
- Prefer transitions made of physical paper or cuts on action. Avoid global crossfades.
- A hold is an intentional reading pause, not a frozen slideshow.

## Build and review
1. Confirm the offer facts and product-image source.
2. Generate Edge TTS `pt-BR-FranciscaNeural` first; derive scene frame bounds from actual audio durations.
3. Build a continuous character action arc across the full short.
4. Produce a contact sheet at regular intervals and inspect the 4K-resolution reveal separately.
5. Review acting, visual continuity, product-image fidelity, text clipping, audio and Shorts safe areas.
6. Validate H.264, 1080 × 1920, 24 fps, duration and audio using ffprobe.
7. Publish only after validation via the dedicated pilot uploader and Production OAuth source.
8. Verify YouTube reports `privacyStatus=public`; record the video ID and URL.

## Reject and revise
Reject a render if the mascot only bobs, the product is a static card for most of the runtime, the resolution reveal has no physical action, adjacent beats repeat the same layout, camera motion is the only motion, text is too small, or narration implies native 4K projection.
