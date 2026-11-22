# Multi-renderer video pipeline

## Engines

- `auto`: reads the per-video render preference, visual profile and scene hints. Remotion remains the safe default for standard reviews, comparisons, Stickman and Shorts.
- `remotion`: current primary renderer and default production-safe composition.
- `hyperframes`: optional editorial montage renderer; a failed render can fall back to Remotion.
- `lemo-opuscar`: optional code-rendered cinematic composition. The worker fetches the upstream Lemo-Opuscar core lazily, uses its Playwright/FFmpeg renderer and then muxes the existing Edge TTS narration. Its output goes through the same ffprobe and Remotion QA gates before YouTube upload.

## Per-video selection

In Admin → Vídeos, select the engine when creating a queue item or change the engine on an item while it is pending/failed. `Automático` is the default. A manual selection stored in `video_queue.media_assets` always beats automatic routing. Stickman is Remotion-only.

Automatic routing recognises explicit visual profiles (`cinematic-motion`, `cinematic-product`, `kinetic-typography`, `data-film`) for Lemo-Opuscar, editorial montage profiles for HyperFrames, and matching per-scene visual hints. Other videos stay on Remotion.

## Safety and fallbacks

- This integration does not change queue scheduling, publication quotas, TTS, YouTube OAuth, upload metadata or affiliate links.
- Every renderer must produce a valid MP4 and pass the same orientation, ffprobe, caption and safe-zone QA before upload.
- `LEMO_REMOTION_FALLBACK=true` and `HYPERFRAMES_REMOTION_FALLBACK=true` keep the production queue moving if an optional renderer fails.
- The initial Lemo integration uses its official core renderer and a Vetor-authored motion composition. It does not claim to implement all 99 upstream style presets; style-specific render templates can be added incrementally.
- Exploded product views must only use verified CAD/BOM or published dimensions. Without engineering files, any 3D view must be labelled an illustrative model and must not invent internal components or measurements.

## Upstream licensing

Lemo-Opuscar core and demo code are MIT-licensed. Its Markdown style guides are CC BY-NC 4.0, with a specific permission to adapt them into the user's own commercial film projects; this does not permit packaging/distributing the guides in a commercial product. The current integration downloads core only and does not bundle the guide text. Check the upstream licence and all third-party credits when adding further presets.
