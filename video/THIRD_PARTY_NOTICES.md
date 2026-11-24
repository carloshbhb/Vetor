# Third-party source and license notes

The production design adapts patterns into Vetor-owned components; it does not vendor the referenced applications.

- **video-shotcraft** — Apache-2.0: https://github.com/Vincentwei1021/video-shotcraft
- **RemotionUI** — MIT: https://github.com/riaz37/remotion-ui
- **Onda** — MIT: https://github.com/degueba/onda
- **RenderComp Free Remotion Templates** — MIT: https://github.com/RenderComp/free-remotion-templates
- **remotion-qa** — MIT: https://github.com/GroMarketing/remotion-qa
- **audio-bed-check** — MIT: https://github.com/oo-pibe/audio-bed-check (evaluated; not integrated until the pipeline includes a separate licensed music bed)

Remotion has its own separate license terms. The licenses above apply only to the referenced component libraries and tools. Preserve copyright, SPDX and NOTICE requirements whenever directly copying source or assets from third-party repositories.

- **Lemo-Opuscar core**: optional render engine fetched on demand from [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar). The core renderer and bundled code are MIT-licensed; the repository's Markdown style guides are CC BY-NC 4.0 with a separate permission for adapting them into the user's own commercial film projects. The initial Vetor integration uses the official core renderer with an original Vetor composition and does not redistribute the style-guide Markdown or third-party demo assets. See the upstream [LICENSE](https://github.com/lemomo-ai/lemo-opuscar/blob/main/LICENSE).

## Evaluated but not vendored

- **mcp-for-blender** — MIT: https://github.com/ahujasid/mcp-for-blender (local authoring workflow documented; the MCP server is not installed on the user's workstation by a GitHub change).
- **librosa** — ISC: https://github.com/librosa/librosa (evaluated; no production dependency added).
- **PixelFX** — MIT: https://github.com/patch-gg/pixelfx (evaluated; no effect source or bundled assets imported).
- **awesome-opus5-5-videos**: https://github.com/yihui-dev/awesome-opus5-5-videos (reference collection only; no source prompt files redistributed).
- **opus-video-prompts**: https://github.com/joeseesun/opus-video-prompts (reference collection only; no source prompt files redistributed).

The two prompt collections must be checked file-by-file for licensing and adapted into tested Vetor-authored prompts before they are shipped in a commercial production pipeline. Do not infer a license from repository availability.
