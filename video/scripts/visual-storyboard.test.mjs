import assert from 'node:assert/strict';
import {
  classifySceneVisual,
  createSceneVisualPlan,
  extractPrimaryMetric,
  motionFromVisualIntent,
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
assert.equal(motionFromVisualIntent('A câmera se aproxima em macro da tela.'), 'push-in');
assert.equal(motionFromVisualIntent('Panorâmica suave para a esquerda mostrando o acabamento.'), 'pan-left');
assert.equal(motionFromVisualIntent('Desliza para a direita e revela a lateral.'), 'pan-right');
assert.equal(motionFromVisualIntent('Inclina a câmera para a direita.'), 'tilt-right');
assert.equal(motionFromVisualIntent('O produto flutua enquanto os dados orbitam.'), 'float');
assert.equal(motionFromVisualIntent('Composição limpa sem movimento definido.'), null);

const directed = createSceneVisualPlan([
  { id: 90, visualCue: 'Detalhe da tela', text: 'Veja a área útil.', visualIntent: 'A câmera se aproxima em macro da tela.' },
  { id: 91, visualCue: 'Acabamento', text: 'Veja a lateral.', visualIntent: 'Panorâmica suave para a esquerda mostrando o acabamento.' },
], 'directed-product');
assert.equal(directed[0].motion, 'push-in');
assert.equal(directed[1].motion, 'pan-left');

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
console.log('visual storyboard contract: all assertions passed');
