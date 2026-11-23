# Multi-renderer video pipeline

## Engines

- `auto`: reads the per-video render preference, visual profile and scene hints. Remotion remains the safe default for standard reviews, comparisons, Stickman and Shorts.
- `remotion`: primary renderer and production-safe default; it owns the existing review compositions, captions, safe zones and QA.
- `hyperframes`: optional editorial montage renderer; a failed render can fall back to Remotion.
- `lemo-opuscar`: optional code-rendered visual treatment using the official MIT core renderer, then muxes the existing Edge TTS narration. Its output goes through the same ffprobe and Remotion QA gates before YouTube upload.

## The 99-style catalogue

Vetor indexes all 99 named styles in the upstream Lemo-Opuscar gallery across 15 visual families. The repository stores only public style names/slugs and Vetor-authored rendering parameters; it does not redistribute upstream `STYLE.md`, `DEMO.md`, prompts, demo films or third-party assets.

Original procedural treatments cover documentary, painterly, sketch, craft, print, graphic, diagram, cartoon, game, analog-film, interface, neon, miniature, evidence and data-visualisation families. Each style slug resolves to its family and a deterministic palette. The three upstream styles marked as requiring generated artwork (`text-flash-cuts`, `comic-history`, `manga-panels`) remain on Remotion until generated assets are supplied.

In Admin → Vídeos, enter a style slug in the optional “Estilo Lemo” field when creating a queue item (for example `ukiyoe`, `neon-tubes` or `dataviz`). Leave it blank for the automatic Vetor director. Choose the render engine independently; an explicit manual engine selection always wins. Stickman is Remotion-only.

## Safety and fallbacks

- This integration does not change queue scheduling, publication quotas, Edge TTS, YouTube OAuth, upload metadata or affiliate links.
- Every renderer must produce a valid MP4 and pass the same orientation, ffprobe, caption and safe-zone QA before upload.
- `LEMO_REMOTION_FALLBACK=true` and `HYPERFRAMES_REMOTION_FALLBACK=true` keep the production queue moving if an optional renderer fails.
- Exploded product views are illustrative only unless verified CAD/BOM or published engineering data is supplied. Never invent internal components or measurements.

## Upstream licensing

The Lemo-Opuscar core is MIT-licensed. Its style guides and demo documentation are CC BY-NC 4.0 with a specific permission for adapting them into the user's own commercial films and project files delivered for those films; that permission does not cover redistributing the guides or selling them. Vetor keeps its original procedural treatments and does not bundle upstream guides. See https://github.com/lemomo-ai/lemo-opuscar and https://creativecommons.org/licenses/by-nc/4.0/.
