# Skill: Opus-inspired creative direction for Vetor

## Purpose
Turn product facts, available media and audience intent into a differentiated, renderable video treatment. This is an original Vetor workflow informed by public examples in the two linked repositories; it is not a copy of their prompts.

## Required inputs
- Product name and exact SKU/version when relevant.
- Verified specifications, limitations, price timestamp and source URLs.
- Approved product gallery, owned footage and available B-roll.
- Target format, duration, platform and explicit user-selected engine/style, if any.
- Existing narration and word/segment timing. Never regenerate TTS in this skill.

## Workflow
1. **Research lock:** separate confirmed facts, claims requiring verification and visual-only metaphors. Never animate an unverified specification as fact.
2. **Select one lead language:** premium product film, kinetic typography, editorial luxury, cinematic 2D/parallax, line-art explainer, isometric explainer, data storytelling, comparison arena, lifestyle demonstration, pixel-art or Three.js motion layer.
3. **Choose support techniques:** no more than two per scene unless a deliberate montage is requested. Prefer a coherent visual grammar over template stacking.
4. **Storyboard before code:** every scene gets a narrative beat, start/end time, visual subject, camera move, transition, caption-safe area, source asset and data provenance.
5. **Asset plan:** real product photography remains the factual hero. Use actual footage when supplied. A generated/abstract scene must be labelled illustrative; never fabricate internal product construction.
6. **Build in Remotion:** deterministic frame-based animation only. Use existing Remotion, Three.js/R3F and GSAP installations where they fit. Three.js motion must be driven by Remotion frame values, not wall-clock animation or R3F useFrame.
7. **Preview efficiently:** render representative frames / a short excerpt first; inspect safe zones, text legibility, continuity, image crop and transition seams.
8. **Critic pass:** return REJECT / REVISE / PASS with concrete frame/time evidence. Do not upload on REJECT or unresolved critical defects.
9. **Preserve pipeline:** keep existing Edge TTS voice, subtitles, Supabase queue, FFmpeg muxing, QA, YouTube OAuth, batch and daily quotas unchanged.

## Selection heuristics
- Product reveal / premium materials: premium product film + restrained 3D orbit.
- Spec explanation: data storytelling + HUD, only with verified values.
- Feature / benefit / limitation: kinetic typography + editorial cards.
- Product comparison: comparison arena + side-by-side evidence, no invented winner.
- Usage context: lifestyle demonstration with real or explicitly illustrative footage.
- Complex mechanism or concept: line-art / isometric explainer; avoid unsupported internal teardown.
- Short attention hook: kinetic typography or match-cut; show product or value proposition immediately.
- Visual-only experimental sequence: pixel-art / shader / generative particles, only when it serves the story.

## Deliverable contract
Return a machine-readable creative plan containing styleId, supportStyles, sceneBeats, assetRequirements, factSources, transitionPlan, captionSafeZones, renderEngine and qaChecklist. renderEngine defaults to Remotion. An explicit manual engine choice always wins over automatic routing.
