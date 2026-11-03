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
