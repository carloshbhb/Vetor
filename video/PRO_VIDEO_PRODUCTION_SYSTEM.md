# Vetor — professional video production system

## Objective

Produce videos with a scene-specific creative direction, an honest asset-fidelity contract, deterministic rendering, measurable media QA and a controlled handoff to the existing publishing queue. The system is designed for product reviews, comparisons, explainers, product demonstrations, editorial/social edits and motion-graphics-led formats. A new genre still needs an explicit creative brief and assets; no renderer can make missing source material factual.

**Remotion remains the primary compositor and default renderer.** The system does not switch renderers just because a different engine exists in the repository.

## Production path

1. **Brief and source material** — product/topic, script, claims, images, gallery, B-roll, scene text, data, aspect ratio and any explicit style/engine override.
2. **Scene director** — classifies each beat (hook, specification, detail, lifestyle, limitation, comparison, price, teardown, verdict), chooses a leading visual language and support treatments, selects camera movement and shot type, and avoids consecutive repetition.
3. **Asset resolver** — chooses verified product photography, matched footage, a reviewed GLB, or an explicitly illustrative 3D archetype. A URL by itself is never proof of product fidelity.
4. **Render routing** — the per-scene Remotion plan chooses among product 3D, 3D/motion graphics, cinematic footage and 2.5D/photo composition. A video-level explicit engine selection can still choose Remotion, Lemo-Opuscar or HyperFrames where the style is supported. Unsupported/failed automatic alternatives retain the existing Remotion fallback.
5. **Render and compose** — scene components, transitions, captions, narration, sound and final format are assembled through the existing Remotion pipeline.
6. **Quality gates** — scene contract tests; TypeScript; real vertical/horizontal Remotion smoke renders; remotion-qa (caption readability, dead air and safe zones); and render-artifact-qa (MP4 streams, exact delivery resolution, FPS, audio audibility and long black frames).
7. **Publish** — the same worker runs the media QA before YouTube upload. A failed gate throws and blocks upload. Queue claiming, OAuth, retry rules, batch size and daily quota remain separate and unchanged.

## Engine and asset responsibilities

| Component | Responsibility | Status |
|---|---|---|
| Remotion | Main composition, captions, timing, transitions, delivery | Primary / production path |
| Three.js + React Three Fiber | Product stages, camera moves and 3D motion graphics inside Remotion | Integrated |
| Shotcraft | Scene recipes and camera/visual treatment ideas | 7 selected recipes adapted as native Remotion components; not the full upstream agent/recipe catalogue |
| Blender / GLB | Author/import real product meshes and export reviewed GLB assets for the Remotion stage | Export workflow present; local Blender MCP activation and model creation remain local steps |
| Lemo-Opuscar | Alternative style-driven full-video renderer | Integrated as an optional on-demand engine; 99 style IDs are catalogued, but that does not mean all 99 have passed individual visual QA |
| HyperFrames | Alternative montage/composition engine | Optional; Remotion fallback retained |
| remotion-qa | Captions, dead air and platform safe zones on rendered video | Integrated as a pre-upload gate |
| librosa | Advanced audio feature/beat analysis | Evaluated, not integrated. Edge TTS word-boundary timing remains the source of speech-caption timing; a separate licensed music bed and an audio-analysis worker are prerequisites for meaningful music beat-sync |
| PixelFX | Pixel-art/effect overlay library | Evaluated, not integrated into production. It is an optional art direction, not a universal video dependency |
| Digital Maker AI | External video-generation service | Pilot explored; the production pipeline does not depend on this service |
| Opus prompt collections | Prompt/reference inspiration for creative direction | Not yet a fully operational prompt pack in the production worker; the native Vetor scene director currently uses its own tested scene/template registry |

### Upstream reference audit

- Vincentwei1021/video-shotcraft — selected ideas from the upstream shot/recipe library have been independently implemented as Vetor components. The seven current adaptations are spotlight-hero-card, product-card-progressive-assemble, scanline-annotate-focus, chart-live-moves, beat-cut-moves, flying-words and light-play-moves. This is a curated subset, not a claim that every source shot was ported.
- ahujasid/mcp-for-blender — documented for local asset authoring. Its local Blender socket must stay on localhost and safe mode should remain enabled. The GitHub integration does not install Blender or activate the MCP on the user's computer.
- three.js — installed in the Remotion project and used by SceneProductStage3D / motion-graphics components.
- librosa/librosa — not part of the production Node worker. Do not make every render depend on Python audio analysis when voice boundaries already provide exact speech timing and no licensed music bed is present.
- patch-gg/pixelfx — not part of the main renderer. Its effect catalogue is a specialty visual option; importing all effects would add dependencies and noise without improving every genre.
- lemomo-ai/lemo-opuscar — optional renderer plus catalog metadata. The external style guides and bundled assets retain their separate licensing restrictions; the code must not silently vendor non-commercial style-guide text into the commercial pipeline.
- yihui-dev/awesome-opus5-5-videos and joeseesun/opus-video-prompts — reference collections only at this stage. Their complete prompts have not been turned into tested, versioned, selectable scene recipes. Treat the content/licensing of each source file independently before copying it.
- Digital Maker AI — the earlier pilot did not meet production quality. No production dependency on its API has been introduced.

## Product 3D truth contract

A product model is verified only when its asset marker carries all of the following from the Blender manifest:

- An HTTPS GLB URL.
- The exact exported GLB SHA-256 (64 hex characters), recomputed over the actual downloaded GLB bytes by the worker.
- review.status = verified.
- A non-empty review.verifiedBy.
- A valid review.verifiedAt.
- At least one review.sourceReferences entry used to compare the exact SKU.

The Blender exporter keeps models at pending-human-review unless the reviewer and references are supplied. A missing/incomplete review never passes the GLB into the final product stage. The worker downloads the candidate GLB (up to 50 MB), recalculates SHA-256 and compares it with the reviewed manifest, then stages those same verified bytes as a temporary Remotion public asset so the model is not downloaded from storage a second time. The temporary file is removed with the other temporary visual assets after processing. The director may still use a category archetype, but it is labeled illustrative-parametric-3d and usesTrueProductGeometry=false. Products without a supported archetype use verified product photography and 2.5D. An exploded view without documented components is explicitly schematic, not a factual teardown.

## Render artifact QA contract

video/scripts/render-artifact-qa.mjs is both a reusable CLI and a production pre-upload gate:

- shorts: 1080×1920; landscape: 1920×1080.
- FPS must be within 24–60.
- A video stream and a non-empty file are required.
- A final audio stream is required and must not be practically silent.
- Long continuous near-black frames over the configured threshold block delivery.
- The JSON evidence report records stream metadata, detected black segments, audio level and gate results.

The gate complements, rather than replaces, remotion-qa. Neither gate measures audience retention, taste, product-model realism, factual accuracy of every spoken claim, or virality. Human review and YouTube Analytics remain necessary for those outcomes.

## Operational safety boundaries

- No change to Supabase queue contracts, job claiming, cron schedule, retries, YouTube OAuth or upload flow.
- Preserve automatic publishing at 15/day in 3 batches of 5, and the existing manual-run behavior.
- A manual pilot is a render artifact, not a YouTube upload.
- GitHub Actions checks and artifacts are for QA; merging to main may trigger the project's normal Production deployment. Do not create Preview deployments.
- Keep secrets in GitHub/Vercel secrets; do not place provider credentials in model assets or manifests.

## Definition of done for a new visual capability

1. It has a declared input/asset contract and an honest fallback.
2. It is selected by the director, not by dead code or a documentation-only reference.
3. It has deterministic tests and at least one actual render in the relevant aspect ratio.
4. The rendered MP4 passes the platform QA and artifact QA.
5. The resulting pilot is inspected for framing, legibility, visual collisions, continuity, product fidelity and scene repetition.
6. It does not bypass the existing queue or upload protections.
