# Third-party source and license notes

The production design borrows documented techniques and adapts them into Vetor-owned components. The repositories below remain independently licensed; no full repository or standalone application was vendored.

- **video-shotcraft** — Apache License 2.0: https://github.com/Vincentwei1021/video-shotcraft
  - Adapted ideas: shot recipes, product spotlight, camera motion, parallax, flash-cut rhythm and frame-by-frame visual QA.
- **RemotionUI** — MIT: https://github.com/riaz37/remotion-ui
  - Adapted ideas: vertical social-clip structure, caption hierarchy, end-card and reusable device/data scenes.
- **Onda** — MIT: https://github.com/degueba/onda
  - Adapted ideas: restrained shared motion tokens, Ken Burns, spotlight, parallax, callouts and consistent scene transitions.
- **RenderComp Free Remotion Templates** — MIT: https://github.com/RenderComp/free-remotion-templates
  - Adapted ideas: kinetic title treatment, split-screen layouts, whip-pan transitions and animated data cards.
- **remotion-qa** — MIT: https://github.com/GroMarketing/remotion-qa
  - Used as an external CLI dependency pinned to version 0.1.3 in GitHub Actions. It is not copied into Vetor source.
- **audio-bed-check** — MIT: https://github.com/oo-pibe/audio-bed-check
  - Reviewed, not installed or executed in this change because the current video mix does not yet contain a separate background-music stem.

Remotion is a separate framework with its own license terms. The licenses above apply to the referenced libraries/templates only, not to Remotion itself.

Any later direct copy of source files, demos, music or sound effects from these repositories must retain the relevant copyright, SPDX, Apache NOTICE or asset-level attribution required by that source's license.
