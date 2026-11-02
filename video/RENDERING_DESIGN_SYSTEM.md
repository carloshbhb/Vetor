# Vetor — Remotion production design system

This document records the GitHub ecosystem review and the source patterns selected for the automated product-video pipeline.

## Selection

| Repository | License / fit | Patterns selected for Vetor |
|---|---|---|
| [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) | Apache-2.0; 124 shot cards / 150 motion examples in its October 2026 catalogue | Product spotlight, 2.5D camera moves, parallax, flash cuts, shot-by-shot visual direction and beat-aware sound design |
| [RemotionUI](https://github.com/riaz37/remotion-ui) | MIT; 206 source-owned components | Social-clip structure, captions, end cards, device mockups, split-screen and data/media scenes |
| [Onda](https://github.com/degueba/onda) | MIT; 70 components / 18 transitions | Restrained shared motion language, Ken Burns, parallax, spotlight, callouts, metrics, captions and device frames |
| [RenderComp Free Templates](https://github.com/RenderComp/free-remotion-templates) | MIT; 50 templates, no bundled font or media assets | Kinetic word stack, title masks, split-screen, whip-pan, animated charts and concise outro structures |
| [remotion-qa](https://github.com/GroMarketing/remotion-qa) | MIT; CLI and GitHub Action | Blocking gate for caption reading pace, dead air and YouTube Shorts safe zones |
| [audio-bed-check](https://github.com/oo-pibe/audio-bed-check) | MIT; Python CLI | Evaluated for future music-bed loop/level and voice-vs-music checks |

## What the Vetor pipeline now does

- Uses a deterministic storyboard planner to classify each narration scene (price check, specification, detail, trade-off, comparison, lifestyle or editorial).
- Varies the camera move per scene and product seed rather than replaying one identical layout.
- Uses three visual phases per narration scene, with B-roll cutaways where assets exist and product-image framing changes between beats.
- Highlights captions word by word and keeps them inside the YouTube Shorts overlay-safe area.
- Moves title and CTA typography away from the platform UI regions.
- Runs remotion-qa after rendering and before YouTube upload. A failed pace/readability or safe-zone check blocks publication and leaves the MP4, beat JSON and flagged frames as a short-lived Actions artifact for diagnosis.
- Keeps Edge TTS, the existing Remotion renderer, Supabase queue, OAuth upload code, 5-video batch limit and three daily schedules.

## Deliberately not imported

- The repositories are used as component/shot references; no standalone editor, database, rendering engine or publishing app is introduced.
- The current production pipeline has a narration stem but no dedicated music-bed stem. audio-bed-check is therefore evaluated but not wired as a hard gate until a properly licensed background-music bed is added. Running a speech-over-music separation check on a narration-only mix would be invalid.
- Remotion Bits and other repositories without a clearly verified license were not copied into the project.
- Third-party product footage is not fabricated. Pexels footage remains supporting B-roll; the product image remains the authoritative product visual.

## Retention and quality limits

The storyboard, moving shots, subtitles and automated QA are production-quality controls, not a promise of virality or a guaranteed retention lift. Actual audience retention must be evaluated against YouTube Analytics after publication (especially the opening 30 seconds, average view duration and scene-level drop-offs).
