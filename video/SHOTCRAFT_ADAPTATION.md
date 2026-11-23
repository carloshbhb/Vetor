# Shotcraft recipe adaptations

Vetor uses a small, curated set of ideas from [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft), not its full agent workflow or publishing stack.

The current native Remotion adaptations are:
- spotlight-hero-card: hero reveal and moving stage light, retuned around the actual product stage.
- product-card-progressive-assemble: a compact fact plate using only the current scene's supplied text or metric.
- scanline-annotate-focus: scanline and focus reticle for a product detail; it does not invent a component label.
- chart-live-moves: animated data frame that displays only a metric supplied by the scene.
- beat-cut-moves: restrained rhythmic visual accents at scene timing boundaries; it does not claim waveform-level music sync.
- flying-words: a three-word kinetic emphasis derived from the scene copy.
- light-play-moves: a moving light sweep for hero and verdict scenes.

## Selection

Automatic selection is narrative-beat based and rotates away from the immediately previous recipe when there is an alternative. A video-level manual choice can be attached as a media_assets marker:

~~~json
{
  "type": "shotcraft_recipe",
  "recipeId": "scanline-annotate-focus"
}
~~~

A scene-level shotcraftRecipeId overrides the video-level choice. Allowed IDs are listed in scripts/shotcraft-recipe-registry.mjs; invalid IDs are ignored and automatic selection is used.

## Scope and licensing

Only recipe names and high-level creative concepts are referenced. The TSX implementations in Vetor are independently authored and do not copy upstream demo files, fixtures, fonts or assets. The upstream repository is licensed Apache-2.0; review its current license and preserve its attribution if any upstream implementation code is later copied or modified.

The recipe renderer is an optional overlay inside the current scene treatment. It does not replace Remotion, the existing scene planner, Edge TTS, the queue, daily quota or YouTube publishing.
