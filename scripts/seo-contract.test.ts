import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateOrganizationSchema,
  generateFAQSchema,
  resolveOgImage,
} from '../src/lib/seo';

test('organization usa entidade #org com logo existente', () => {
  const org = generateOrganizationSchema() as Record<string, unknown>;
  assert.equal(org['@id'], 'https://www.vetor.blog/#org');
  assert.equal(org.logo, 'https://www.vetor.blog/og.png');
});

test('FAQPage espelha o FAQ visível, pergunta por pergunta', () => {
  const faqs = [
    { question: 'X é bom?', answer: 'Sim, para o perfil Y.' },
    { question: 'Quanto custa X?', answer: 'A partir de R$ 100.' },
  ];
  const schema = generateFAQSchema(faqs) as Record<string, unknown>;
  assert.equal(schema['@type'], 'FAQPage');
  const entities = schema.mainEntity as Array<Record<string, unknown>>;
  assert.equal(entities.length, 2);
  assert.equal(entities[0].name, 'X é bom?');
  assert.equal((entities[0].acceptedAnswer as Record<string, unknown>).text, 'Sim, para o perfil Y.');
  assert.equal(entities[1].name, 'Quanto custa X?');
});

test('resolveOgImage cai para /og.png sem imagem própria', () => {
  assert.equal(
    resolveOgImage('https://www.vetor.blog/assets/img/x.jpg'),
    'https://www.vetor.blog/assets/img/x.jpg'
  );
  assert.equal(resolveOgImage(null), 'https://www.vetor.blog/og.png');
  assert.equal(resolveOgImage(undefined), 'https://www.vetor.blog/og.png');
  assert.equal(resolveOgImage(''), 'https://www.vetor.blog/og.png');
});
