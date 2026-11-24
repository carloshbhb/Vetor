# Vetor Remotion production design system

The automated renderer uses the Remotion engine already present in Vetor. External repositories are references for component patterns, not replacements for the pipeline.

## Selected sources
- video-shotcraft: shot planning, camera treatment, parallax and 2.5D product reveals.
- RemotionUI: social clip structures, device scenes, caption and end-card composition.
- Onda: restrained motion tokens, callouts, graphics, captions and transitions.
- RenderComp Free Templates: kinetic titles, split-screen, whip-pan and animated charts.
- remotion-qa: pre-upload safe zones, caption pace and dead-air checks.
- audio-bed-check: evaluated but not enabled because no separate licensed music bed exists.

## Vetor-specific implementation
- Scene storyboard classifies product details, specifications, prices, limitations, comparisons and lifestyle moments.
- Per-scene camera motion and framing vary deterministically by product and scene.
- Up to five verified marketplace gallery images can be used per product; the primary image is retained.
- Up to five unique supporting clips are matched to the scene keywords, without cyclic reuse.
- Edge TTS WordBoundary offsets synchronize captions when speech tokens align exactly; otherwise the worker safely falls back to segment-based timing.
- The quality gate blocks upload on illegible or unsafe renders.
- Remotion, Edge TTS, Supabase queue, YouTube uploader and the 5-video batch / 15-video daily cap remain intact.

Automated quality gates are not a promise of virality. Actual retention gains must be measured with YouTube Analytics after publication.

## Production contracts (November 2026)

- A GLB URL is not a verified product model. Product fidelity requires a human-reviewed manifest with SHA-256, reviewer, timestamp and source references for the exact SKU.
- Parametric category geometry remains available as explicitly illustrative 3D. It must not be labeled true product geometry.
- The worker ignores unreviewed GLB files and falls back to the illustrative archetype or verified product photography.
- Before YouTube upload, the final MP4 must pass both remotion-qa and render-artifact-qa. The latter checks stream presence, delivery resolution, FPS, audio audibility and long near-black segments.
- GitHub Actions renders vertical and landscape fixtures and preserves JSON quality evidence as an artifact.

See [PRO_VIDEO_PRODUCTION_SYSTEM.md](./PRO_VIDEO_PRODUCTION_SYSTEM.md) for the complete architecture and reference audit.
