import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateHeadlineLines,
  fitHeadlineSize,
  headlineFromText,
  toHeadline,
  truncateHeadline,
} from '../src/utils/scene-headline.ts';

test('keeps a chapter-style cue as the headline', () => {
  assert.equal(toHeadline('Tela e experiência visual', 'Notebooks'), 'Tela e experiência visual');
  assert.equal(toHeadline('Autonomia e carregamento.', 'Notebooks'), 'Autonomia e carregamento');
});

test('strips camera direction prefixes when the rest is still a headline', () => {
  assert.equal(toHeadline('Close-up em materiais e acabamento', 'Acabamento premium'), 'Materiais e acabamento');
  assert.equal(toHeadline('Ícone de bateria e carregador', 'Bateria'), 'Bateria e carregador');
});

test('falls back to narration when the cue is a shot direction', () => {
  assert.equal(
    toHeadline(
      'Imagem estática do ASUS Vivobook 15 X1504VA em ângulo de 45 graus',
      'ASUS Vivobook 15 X1504VA chega como opção moderna',
    ),
    'ASUS Vivobook 15 X1504VA chega como opção',
  );
  assert.equal(
    toHeadline('Divisão de tela mostrando os dois notebooks lado a lado', 'Comparação lado a lado'),
    'Comparação lado a lado',
  );
});

test('narration fallback drops leading connectors and articles', () => {
  assert.equal(
    headlineFromText(
      'O ASUS Vivobook 15 X1504VA chega como opção moderna para quem busca design atual e portabilidade no dia a dia.',
      'Notebooks',
    ),
    'ASUS Vivobook 15 X1504VA chega como opção',
  );
  assert.equal(
    headlineFromText('Já o Dell Inspiron I15-i1300-a15p mantém o foco na confiabilidade tradicional.', 'Notebooks'),
    'Dell Inspiron I15-i1300-a15p mantém o foco na',
  );
});

test('truncation never cuts a word in half', () => {
  const result = truncateHeadline('palavra '.repeat(10), 20);
  assert.ok(result.length <= 20);
  assert.equal(result, 'Palavra palavra');
});

test('empty input still yields a readable headline', () => {
  assert.equal(toHeadline('', 'Notebooks'), 'Notebooks');
  assert.equal(toHeadline('', ''), 'Análise Vetor');
});

test('headline fitting keeps the largest size inside the header band', () => {
  const short = fitHeadlineSize('Tela ampla', {
    width: 740,
    maxHeight: 200,
    maxSize: 96,
    minSize: 44,
  });
  const long = fitHeadlineSize(
    'ASUS Vivobook 15 X1504VA ou Dell Inspiron I15-i1300-a15p? Qual notebook de entrada realmente compensa em 2026?',
    { width: 740, maxHeight: 200, maxSize: 96, minSize: 42 },
  );

  assert.equal(short, 96);
  assert.ok(long < short);
  assert.ok(long >= 42);
  assert.ok(
    estimateHeadlineLines(
      'ASUS Vivobook 15 X1504VA ou Dell Inspiron I15-i1300-a15p? Qual notebook de entrada realmente compensa em 2026?',
      long,
      740,
    ) * long * 1.02 <= 200,
  );
});
