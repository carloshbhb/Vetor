import assert from 'node:assert/strict';
import { buildReviewUpdatePayload, resolveReviewWriteMode } from '../src/lib/review-persistence';

const timestamp = '2026-10-14T20:30:00.000Z';
const patch = buildReviewUpdatePayload({
  meta_title: 'Título revisado',
}, timestamp);

assert.deepEqual(patch, {
  updated_at: timestamp,
  meta_title: 'Título revisado',
}, 'um PATCH de título deve incluir somente o título e updated_at');
assert.equal('sections' in patch, false, 'seções omitidas não podem ser apagadas');
assert.equal('faq' in patch, false, 'FAQ omitido não pode ser apagado');
assert.equal('compare_table' in patch, false, 'tabela comparativa omitida não pode ser apagada');
assert.equal('status' in patch, false, 'status não deve ser alterado por uma edição parcial');
assert.equal('slug' in patch, false, 'slug não deve ser alterado por uma edição parcial');

const fullEditorialPatch = buildReviewUpdatePayload({
  sections: [{ id: 'overview', heading: 'Visão geral', tocEmoji: '', tocLabel: 'Visão geral', content: 'Conteúdo preservado' }],
  faq: [{ question: 'Pergunta', answer: 'Resposta' }],
  compare_table: { rows: [], caption: '', columns: [], winnerCol: 0 },
  hero_overall_score: 8.5,
}, timestamp);
assert.equal(Array.isArray(fullEditorialPatch.sections), true, 'seções explicitamente enviadas devem ser atualizadas');
assert.equal(Array.isArray(fullEditorialPatch.faq), true, 'FAQ explicitamente enviado deve ser atualizado');
assert.equal(typeof fullEditorialPatch.compare_table, 'object', 'tabela explicitamente enviada deve ser atualizada');
assert.equal(fullEditorialPatch.schema_rating_value, 8.5, 'nota editorial deve sincronizar o campo do schema');

assert.equal(resolveReviewWriteMode(true, true), 'insert', 'insertOnly não pode atualizar registro existente');
assert.equal(resolveReviewWriteMode(false, false), 'insert', 'slug novo deve seguir caminho de insert');
assert.equal(resolveReviewWriteMode(false, true), 'update', 'slug existente deve seguir caminho de update parcial');

console.log('Review persistence regression tests passed');
