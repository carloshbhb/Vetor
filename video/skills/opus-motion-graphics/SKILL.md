# Skill: Code-rendered motion graphics

## Approved implementation toolbox already present
- Remotion 4: composition, sequences, frame-driven transitions, captions and final MP4.
- Three.js + @react-three/fiber + @remotion/three: optional 3D layers.
- GSAP: useful for authored motion systems where compatible with deterministic frame seeking; derive state from the frame/time, not uncontrolled timers.
- SVG / CSS / Canvas 2D: lightweight vector, line-art, charts and UI motion.
- FFmpeg: existing audio/video muxing and encoding; do not introduce another export path for production.

## Technique library
- Kinetic type: word-by-word reveals, masked text, scale/position punches, controlled overshoot.
- Product film: hero framing, macro crops, rim-light treatment, parallax, measured orbit and match cuts.
- Line art: stroke reveals, simple character rigs, hand-drawn paths and explanatory diagrams.
- Isometric: layered planes, connectors, node-to-node flows and spatial labels.
- Data film: chart build, number counters and callouts whose values are bound to verified input.
- HUD: scan line, brackets, orbit markers and restrained technical labels.
- UI morph: one component transforms between states; preserve geometric continuity and beat timing.
- Pixel art: low-resolution logical canvas, palette lock and integer-coordinate motion.
- Shader / particles: use sparingly, cap particle counts and avoid obscuring the product or captions.
- 2.5D / parallax: separate foreground, subject and background; move the camera with subtle depth.

## Determinism rules
- Animation must be a pure function of Remotion frame and props.
- No Date.now(), random unseeded values, setTimeout, requestAnimationFrame or live network calls in a composition.
- Seed pseudo-random variation from a stable product/scene identifier.
- Respect composition FPS and duration. Never assume 60fps.
- Keep all important content inside the platform-specific safe zone.
- Use Sequence and explicit frame ranges for scene-level timing.
- Use existing subtitle timing; never independently retime audio or captions.

## Visual quality rules
- One dominant visual idea per shot.
- Every cut must add information, change scale, or advance the narrative.
- Keep text short, high contrast and readable on mobile.
- Avoid gratuitous glow, shake, particles, RGB split and excessive transitions.
- Real product photos must not be warped into false product geometry.
- Do not use illustrative geometry as proof of internal product construction.
