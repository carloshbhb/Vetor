# Skill: Independent video critic and QA

Evaluate the rendered excerpt or final MP4 as an independent reviewer, not as the author.

## Verdicts
- **REJECT:** factual error, missing/corrupt media, unreadable captions, unsafe framing, black/dead frames, audio mismatch, severe visual defect, or failed technical probe.
- **REVISE:** technically valid but weak hook, repetitive shots, poor pacing, weak hierarchy, awkward transition, excessive decoration, or unclear benefit.
- **PASS:** no critical factual/technical defects; visual hierarchy, rhythm, readability and story are coherent.

## Review passes
1. **First-second test:** does the first frame communicate a specific product, question or benefit?
2. **Story test:** every scene advances the argument; no generic filler.
3. **Product test:** correct model, scale, image integrity, asset quality and continuity.
4. **Typography test:** safe-zone placement, no clipping, readable contrast and sensible line lengths.
5. **Motion test:** easing, continuity, no frozen layers, no visual collision, no accidental jitter.
6. **Timing test:** cuts support the narration; no dead air; do not change source audio timings.
7. **Factual test:** every displayed number/claim traces to supplied product facts; limitations remain visible.
8. **Technical test:** dimensions, FPS, codec, duration, audio track, black frames and output path.
9. **Platform test:** Shorts UI-safe areas and long-form framing are respected.

## Required report
Return verdict, timecodes, defect severity, evidence, proposed fix and whether a rerender is required. Never mark PASS based only on source code inspection. A video is not ready for upload until the actual rendered artifact passes the existing QA gate.
