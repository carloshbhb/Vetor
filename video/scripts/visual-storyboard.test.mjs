import assert from 'node:assert/strict';
import {
  classifySceneVisual,
  createSceneVisualPlan,
  extractPrimaryMetric,
  planSceneBeats,
} from '../src/utils/visual-storyboard.ts';

assert.equal(classifySceneVisual({ visualCue: 'Preço e condições', text: 'Confira o preço total e o frete.' }), 'price-check');
assert.equal(classifySceneVisual({ visualCue: 'Autonomia', text: 'Bateria de 5.000 mAh.' }), 'specification');
assert.equal(classifySceneVisual({ visualCue: 'O que vale saber', text: 'A tela é LCD, não AMOLED.' }), 'tradeoff');
assert.equal(classifySceneVisual({ visualCue: 'Limitação', text: 'Não possui GPS integrado.' }), 'tradeoff');
assert.equal(classifySceneVisual({ visualCue: 'Tela e acabamento', text: 'Veja a tela e os materiais.' }), 'detail');
assert.equal(classifySceneVisual({ visualCue: 'Uso na rotina', text: 'Para estudo e trabalho.' }), 'lifestyle');
assert.equal(classifySceneVisual({ visualCue: 'Alternativas', text: 'Compare com concorrentes.' }), 'comparison');
assert.equal(extractPrimaryMetric('Bateria de 5.000 mAh para a rotina.'), '5.000 mAh');
assert.equal(extractPrimaryMetric('Confira o preço atualizado.'), null);

const scenes = [
  { id: 1, visualCue: 'Tela', text: 'Tela ampla e nítida.' },
  { id: 2, visualCue: 'Bateria', text: 'Autonomia de 5.000 mAh.' },
  { id: 3, visualCue: 'Preço', text: 'Compare o valor total.' },
  { id: 4, visualCue: 'Limitações', text: 'Confira as ressalvas.' },
];
const first = createSceneVisualPlan(scenes, 'produto-a');
const second = createSceneVisualPlan(scenes, 'produto-a');
const other = createSceneVisualPlan(scenes, 'produto-b');
assert.deepEqual(first, second, 'visual plan must be deterministic');
assert.notDeepEqual(first, other, 'different product seeds should vary the motion plan');
assert.equal(first.length, scenes.length);
assert.ok(first.every((item) => item.motion && item.mode && item.label));

// Beats: every scene is split into short, varied visual segments.
const fps = 30;
const rich = planSceneBeats(9 * fps, { fps, hasBroll: true, hasMetric: true, imageCount: 3, seed: 'produto-a:1' });
assert.ok(rich.length >= 3 && rich.length <= 4, 'a 9s scene becomes ~3 beats of ~2.6s, got ' + rich.length);
assert.equal(rich[0].kind, 'hero', 'scene opens on the hero shot');
assert.equal(rich[1].kind, 'callout', 'spec callout comes right after the hero');
assert.ok(rich.some((beat) => beat.kind === 'broll'));
assert.equal(rich[0].startFrame, 0);
assert.equal(rich[rich.length - 1].endFrame, 9 * fps, 'beats tile the whole scene');
rich.forEach((beat, index) => {
  assert.ok(beat.endFrame - beat.startFrame >= 1.6 * fps - 1, 'beat is never shorter than the reading floor');
  if (index > 0) {
    assert.equal(beat.startFrame, rich[index - 1].endFrame, 'no gaps or overlaps');
    assert.notEqual(beat.kind, rich[index - 1].kind, 'no two consecutive beats look the same');
  }
  assert.ok(beat.focusX > 0 && beat.focusX < 1 && beat.focusY > 0 && beat.focusY < 1);
});
assert.deepEqual(rich, planSceneBeats(9 * fps, { fps, hasBroll: true, hasMetric: true, imageCount: 3, seed: 'produto-a:1' }), 'deterministic');

const plain = planSceneBeats(10 * fps, { fps, imageCount: 1, seed: 'x' });
assert.ok(plain.every((beat) => beat.kind !== 'callout' && beat.kind !== 'broll' && beat.kind !== 'gallery'),
  'no callout without a metric, no broll without a clip, no gallery with a single image');
assert.ok(plain.length >= 3);

const withGallery = planSceneBeats(12 * fps, { fps, imageCount: 4, seed: 'g' });
withGallery.filter((beat) => beat.kind === 'gallery').forEach((beat) => {
  assert.ok(beat.imageIndex >= 1 && beat.imageIndex < 4, 'gallery beats use the other photos, never out of range');
});
assert.ok(withGallery.filter((beat) => beat.kind === 'broll').length === 0);

const tiny = planSceneBeats(2 * fps, { fps, hasMetric: true, hasBroll: true, imageCount: 3, seed: 't' });
assert.equal(tiny.length, 1, 'a very short scene stays a single beat instead of flickering');
assert.equal(tiny[0].kind, 'hero');
const long = planSceneBeats(35 * fps, { fps, hasBroll: true, imageCount: 2, seed: 'l' });
assert.ok(long.length >= 10, 'long scenes keep changing visuals too');
assert.ok(long.filter((beat) => beat.kind === 'broll').length === 1, 'one B-roll cutaway per scene');
assert.equal(planSceneBeats(0, { fps }).length, 1, 'degenerate duration still yields one beat');
console.log('visual storyboard contract: all assertions passed');
